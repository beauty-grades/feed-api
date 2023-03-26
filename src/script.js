import fetch from "node-fetch";

import { Clase, Classroom, Course, Curriculum, Enrollment, Evaluation, Level, Level_Course, Period, Score, Student, Student_Curriculum, Teacher, } from "./classes.js";
import { getXataClient } from "./xata.js";

export const populate = async (auth_token, email) => {
    const Xata = getXataClient();
    // 1st level objects
    let curriculums = [];
    let periods = [];
    let courses = [];
    let student;
    let teachers = [];
    // 2nd level objects
    let levels = [];
    let clases = [];
    let student_curriculums = [];
    // 3rd level objects
    let level_courses = [];
    let classrooms = [];
    let evaluations = [];
    // 4th level objects
    let enrollments = [];
    // 5th level objects
    let scores = [];
    let temp_classrooms_scores = [];
    student = new Student(email);
    await Promise.all([
        // Curriculums
        (async () => {
            const res_get_curriculums = await fetch("https://api.utec.edu.pe/academico-api/core/filtromalla/student/academic_programs?program=1", {
                headers: {
                    "x-auth-token": auth_token,
                },
            });
            const json = (await res_get_curriculums.json());
            const fetched_curriculums = json.content;
            await Promise.all(fetched_curriculums.map(async ({ academicProgramId, tittle }) => {
                const current_curriculum = new Curriculum(tittle);
                curriculums.push(current_curriculum);
                const current_student_curriculum = new Student_Curriculum(student, current_curriculum);
                student_curriculums.push(current_student_curriculum);
                const res_get_curriculum = await fetch("https://api.utec.edu.pe/academico-api/alumnos/me/web/academic/curriculum", {
                    method: "POST",
                    headers: {
                        "x-auth-token": auth_token,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        academicProgramId: academicProgramId,
                    }),
                });
                const json = (await res_get_curriculum.json());
                const fetched_levels = json.content.academicCurriculum;
                fetched_levels.map(({ title, courses: raw_courses }) => {
                    const current_level = new Level(parseInt(title.split(" ")[1]), current_curriculum);
                    levels.push(current_level);
                    let elective_count = 0;
                    raw_courses.forEach((course) => {
                        var _a;
                        if (course.isElective) {
                            elective_count++;
                        }
                        else {
                            let classroom_score = ((_a = course.summaryEnrolled[0]) === null || _a === void 0 ? void 0 : _a.classroomAverage) || undefined;
                            if (classroom_score) {
                                temp_classrooms_scores.push({
                                    course_handle: course.codeCourse.trim(),
                                    classroom_score,
                                });
                            }
                            // Check if course is in courses array
                            const parsed_handle = course.codeCourse.trim();
                            const parsed_name = course.course.trim();
                            let current_course = courses.find((course) => course.handle === parsed_handle);
                            if (!current_course) {
                                current_course = new Course(parsed_handle, parsed_name);
                                courses.push(current_course);
                            }
                            const current_level_course = new Level_Course(current_level, current_course, course.credits);
                            level_courses.push(current_level_course);
                        }
                    });
                    if (elective_count > 0) {
                        current_level.setElectiveCount(elective_count);
                    }
                });
            }));
        })(),
        (async () => {
            const res_get_periods = await fetch("https://api.utec.edu.pe/academico-api/alumnos/me/periodosPorAlumno", {
                method: "POST",
                headers: {
                    "x-auth-token": auth_token,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    hello: "world",
                }),
            });
            const json = (await res_get_periods.json());
            const fetched_periods = json.content;
            await Promise.all(fetched_periods.map(async ({ codPeriodo, descPeriodo }) => {
                const current_period = new Period(descPeriodo.replaceAll(" ", ""));
                periods.push(current_period);
                const res_get_period = await fetch(`https://api.utec.edu.pe/academico-api/alumnos/me/course/details`, {
                    method: "POST",
                    headers: {
                        "x-auth-token": auth_token,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        period: codPeriodo,
                        program: "1",
                    }),
                });
                const json = (await res_get_period.json());
                const fetched_courses = json.content;
                fetched_courses.map((course) => {
                    // Check if course is in courses array
                    const parsed_handle = course.idCourse.trim();
                    const parsed_title = course.titleCourse.trim();
                    let current_course = courses.find((c) => c.handle === parsed_handle);
                    if (!current_course) {
                        current_course = new Course(parsed_handle, parsed_title);
                        courses.push(current_course);
                    }
                    const current_clase = new Clase(current_course, current_period);
                    clases.push(current_clase);
                    let [first_name, last_name] = course.teacher.split(", ");
                    first_name = first_name.trim();
                    last_name = last_name.trim();
                    let current_teacher = teachers.find((teacher) => teacher.first_name === first_name &&
                        teacher.last_name === last_name);
                    if (!current_teacher) {
                        current_teacher = new Teacher(first_name, last_name);
                        teachers.push(current_teacher);
                    }
                    const current_classroom = new Classroom(parseInt(course.sectionName), current_clase, current_teacher);
                    classrooms.push(current_classroom);
                    const current_enrollment = new Enrollment(student, current_classroom, parseFloat(course.finalScore));
                    enrollments.push(current_enrollment);
                    let current_evaluations = [];
                    let current_scores = [];
                    course.scores.map((score) => {
                        let name = score.name.trim();
                        let handle = score.code.split(" ")[0];
                        let weight = 0;
                        let weightRegex = new RegExp(`\\d+\\%\\s${handle}`);
                        let weightMatch = weightRegex.exec(course.formula);
                        if (weightMatch) {
                            const weightString = weightMatch[0].split("%")[0];
                            weight = Number(weightString) / 100;
                        }
                        else {
                            name = name.replace(/[0-9]/g, "");
                            weightRegex = new RegExp(`\\d+\\%\\s${name}`);
                            weightMatch = weightRegex.exec(course.formula);
                            if (weightMatch) {
                                const weightString = weightMatch[0].split("%")[0];
                                weight = Number(weightString) / 100;
                            }
                        }
                        // Check if evaluation is in evaluations array
                        let current_evaluation = evaluations.find((evaluation) => evaluation.handle === handle &&
                            evaluation.clase === current_clase);
                        if (!current_evaluation) {
                            current_evaluation = new Evaluation(handle, name, weight, score.delete, current_clase);
                            current_evaluations.push(current_evaluation);
                            evaluations.push(current_evaluation);
                        }
                        let current_score = current_scores.find((grade) => grade.evaluation === current_evaluation);
                        if (!current_score) {
                            current_score = new Score(current_evaluation, current_enrollment, [parseFloat(score.score)]);
                            current_scores.push(current_score);
                            scores.push(current_score);
                        }
                        else {
                            current_score.addGrade(parseFloat(score.score));
                        }
                    });
                });
            }));
        })(),
    ]);
    classrooms.forEach((classroom) => {
        const course_handle = classroom.clase.course.handle;
        let final_classroom_score = temp_classrooms_scores.find((temp_classroom) => temp_classroom.course_handle === course_handle);
        if (final_classroom_score) {
            classroom.setScore(final_classroom_score.classroom_score);
        }
    });
    // Registering in Xata
    let XataRecords = {};
    // 1st level of parallelism
    await Promise.all([
        // Register Curriculums
        (async () => {
            XataRecords.curriculums = await Promise.all(curriculums.map(async (curriculum) => {
                const curriculums_matched = await Xata.db.curriculum
                    .filter({
                    handle: curriculum.handle,
                })
                    .getMany();
                if (curriculums_matched.length > 0) {
                    return curriculums_matched[0];
                }
                else {
                    return await Xata.db.curriculum.create({
                        handle: curriculum.handle,
                    });
                }
            }));
        })(),
        // Register Periods
        (async () => {
            XataRecords.periods = await Promise.all(periods.map(async (period) => {
                const periods_matched = await Xata.db.period
                    .filter({
                    handle: period.handle,
                })
                    .getMany();
                if (periods_matched.length > 0) {
                    return periods_matched[0];
                }
                else {
                    return await Xata.db.period.create({
                        handle: period.handle,
                    });
                }
            }));
        })(),
        // Register Courses
        (async () => {
            XataRecords.courses = await Promise.all(courses.map(async (course) => {
                const courses_matched = await Xata.db.course
                    .filter({
                    handle: course.handle,
                })
                    .getMany();
                if (courses_matched.length > 0) {
                    return courses_matched[0];
                }
                else {
                    return await Xata.db.course.create({
                        handle: course.handle,
                        name: course.name,
                    });
                }
            }));
        })(),
        // Register Student
        (async () => {
            let student_matched = await Xata.db.student
                .filter({
                email: student.email,
            })
                .getMany();
            if (student_matched.length > 0) {
                XataRecords.student = student_matched[0];
            }
            else {
                XataRecords.student = await Xata.db.student.create({
                    email: student.email,
                });
            }
        })(),
        // Register Teachers
        (async () => {
            XataRecords.teachers = await Promise.all(teachers.map(async (teacher) => {
                const teachers_matched = await Xata.db.teacher
                    .filter({
                    first_name: teacher.first_name,
                })
                    .filter({
                    last_name: teacher.last_name,
                })
                    .getMany();
                if (teachers_matched.length > 0) {
                    return teachers_matched[0];
                }
                else {
                    return await Xata.db.teacher.create({
                        first_name: teacher.first_name,
                        last_name: teacher.last_name,
                    });
                }
            }));
        })(),
    ]);
    // 2nd level of parallelism
    await Promise.all([
        // Register Levels
        (async () => {
            XataRecords.levels = await Promise.all(levels.map(async (level) => {
                const xata_curriculum = XataRecords.curriculums.find((curriculum) => curriculum.handle === level.curriculum.handle);
                if (!xata_curriculum) {
                    throw new Error("Curriculum not found");
                }
                const levels_matched = await Xata.db.level
                    .select(["*", "curriculum.*"])
                    .filter({
                    "curriculum.id": xata_curriculum.id,
                })
                    .filter({
                    number: level.number,
                })
                    .getMany();
                if (levels_matched.length > 0) {
                    return levels_matched[0];
                }
                else {
                    const xata_level = await Xata.db.level.create({
                        number: level.number,
                        curriculum: xata_curriculum.id,
                        elective_count: level.elective_count,
                    });
                    const fixed_xata_level = JSON.parse(JSON.stringify(xata_level));
                    fixed_xata_level.curriculum.handle = level.curriculum.handle;
                    return fixed_xata_level;
                }
            }));
        })(),
        // Register Classes
        (async () => {
            XataRecords.classes = await Promise.all(clases.map(async (clase) => {
                const xata_course = XataRecords.courses.find((course) => course.handle === clase.course.handle);
                if (!xata_course) {
                    throw new Error("Course not found");
                }
                const xata_period = XataRecords.periods.find((period) => period.handle === clase.period.handle);
                if (!xata_period) {
                    throw new Error("Period not found");
                }
                const classes_matched = await Xata.db.class
                    .filter({
                    "course.id": xata_course.id,
                })
                    .filter({
                    "period.id": xata_period.id,
                })
                    .getMany();
                if (classes_matched.length > 0) {
                    return classes_matched[0];
                }
                else {
                    return (await Xata.db.class.create({
                        course: xata_course.id,
                        period: xata_period.id,
                    }));
                }
            }));
        })(),
        // Register StudentCurriculums
        (async () => {
            XataRecords.student_curriculums = (await Promise.all(student_curriculums.map(async (student_curriculum) => {
                const xata_student = XataRecords.student;
                if (!xata_student) {
                    throw new Error("Student not found");
                }
                const xata_curriculum = XataRecords.curriculums.find((curriculum) => curriculum.handle === student_curriculum.curriculum.handle);
                if (!xata_curriculum) {
                    throw new Error("Curriculum not found");
                }
                const student_curriculums_matched = await Xata.db.student_curriculum
                    .filter({
                    "student.id": xata_student.id,
                })
                    .filter({
                    "curriculum.id": xata_curriculum.id,
                })
                    .getMany();
                if (student_curriculums_matched.length > 0) {
                    return student_curriculums_matched[0];
                }
                else {
                    return await Xata.db.student_curriculum.create({
                        student: xata_student.id,
                        curriculum: xata_curriculum.id,
                    });
                }
            })));
        })(),
    ]);
    // 3rd level of parallelism
    await Promise.all([
        // Register LevelCourses
        (async () => {
            XataRecords.level_courses = (await Promise.all(level_courses.map(async (level_course) => {
                const xata_level = XataRecords.levels.find((xata_level) => {
                    var _a;
                    return xata_level.number === level_course.level.number &&
                        ((_a = xata_level.curriculum) === null || _a === void 0 ? void 0 : _a.handle) ===
                            level_course.level.curriculum.handle;
                });
                if (!xata_level) {
                    throw new Error("Level not found");
                }
                const xata_course = XataRecords.courses.find((course) => course.handle === level_course.course.handle);
                if (!xata_course) {
                    throw new Error("Course not found");
                }
                const level_courses_matched = await Xata.db.level_course
                    .filter({
                    "level.id": xata_level.id,
                })
                    .filter({
                    "course.id": xata_course.id,
                })
                    .getMany();
                if (level_courses_matched.length > 0) {
                    return level_courses_matched[0];
                }
                else {
                    return (await Xata.db.level_course.create({
                        level: xata_level.id,
                        course: xata_course.id,
                        credits: level_course.credits,
                    }));
                }
            })));
        })(),
        // Register Evaluations
        (async () => {
            XataRecords.evaluations = (await Promise.all(evaluations.map(async (evaluation) => {
                const xata_class = XataRecords.classes.find((clase) => {
                    var _a;
                    const xata_course_id = ((_a = clase.course) === null || _a === void 0 ? void 0 : _a.id) || "123";
                    const xata_course = XataRecords.courses.find((course) => course.id === xata_course_id);
                    return (xata_course === null || xata_course === void 0 ? void 0 : xata_course.handle) === evaluation.clase.course.handle;
                });
                if (!xata_class) {
                    throw new Error("Class not found");
                }
                const evaluations_matched = await Xata.db.evaluation
                    .filter({
                    "class.id": xata_class.id,
                })
                    .filter({
                    handle: evaluation.handle,
                })
                    .getMany();
                if (evaluations_matched.length > 0) {
                    return evaluations_matched[0];
                }
                else {
                    return await Xata.db.evaluation.create({
                        handle: evaluation.handle,
                        name: evaluation.name,
                        class: xata_class.id,
                        weight: evaluation.weight,
                        delete_lowest: evaluation.delete_lowest,
                    });
                }
            })));
        })(),
        // Register Classrooms
        (async () => {
            XataRecords.classrooms = (await Promise.all(classrooms.map(async (classroom) => {
                const xata_class = XataRecords.classes.find((clase) => {
                    var _a;
                    const xata_course_id = ((_a = clase.course) === null || _a === void 0 ? void 0 : _a.id) || "123";
                    const xata_course = XataRecords.courses.find((course) => course.id === xata_course_id);
                    return (xata_course === null || xata_course === void 0 ? void 0 : xata_course.handle) === classroom.clase.course.handle;
                });
                if (!xata_class) {
                    throw new Error("Class not found");
                }
                const classrooms_matched = await Xata.db.classroom
                    .filter({
                    "class.id": xata_class.id,
                })
                    .filter({
                    section: classroom.section,
                })
                    .getMany();
                if (classrooms_matched.length > 0) {
                    return classrooms_matched[0];
                }
                else {
                    const xata_teacher = XataRecords.teachers.find((teacher) => teacher.first_name === classroom.teacher.first_name &&
                        teacher.last_name === classroom.teacher.last_name);
                    return (await Xata.db.classroom.create({
                        section: classroom.section,
                        class: xata_class.id,
                        teacher: xata_teacher === null || xata_teacher === void 0 ? void 0 : xata_teacher.id,
                        score: classroom.score,
                    }));
                }
            })));
        })(),
    ]);
    // 4th level of parallelism
    XataRecords.enrollments = (await Promise.all(enrollments.map(async (enrollment) => {
        const xata_student = XataRecords.student;
        if (!xata_student) {
            throw new Error("Student not found");
        }
        const xata_classroom = XataRecords.classrooms.find((classroom) => {
            var _a, _b;
            const xata_class_id = ((_a = classroom.class) === null || _a === void 0 ? void 0 : _a.id) || "123";
            const xata_class = XataRecords.classes.find((clase) => clase.id === xata_class_id);
            const xata_course_id = ((_b = xata_class === null || xata_class === void 0 ? void 0 : xata_class.course) === null || _b === void 0 ? void 0 : _b.id) || "123";
            const xata_course = XataRecords.courses.find((course) => course.id === xata_course_id);
            return (xata_course === null || xata_course === void 0 ? void 0 : xata_course.handle) === enrollment.classroom.clase.course.handle;
        });
        if (!xata_classroom) {
            throw new Error("Classroom not found");
        }
        const enrollments_matched = await Xata.db.enrollment
            .filter({
            "student.id": xata_student.id,
        })
            .filter({
            "classroom.id": xata_classroom.id,
        })
            .getMany();
        if (enrollments_matched.length > 0) {
            return enrollments_matched[0];
        }
        else {
            return (await Xata.db.enrollment.create({
                student: xata_student.id,
                classroom: xata_classroom.id,
                final_score: enrollment.final_score,
            }));
        }
    })));
    // 5th level of parallelism
    XataRecords.scores = (await Promise.all(scores.map(async (score) => {
        const xata_enrollment = XataRecords.enrollments.find((enrollment) => {
            var _a, _b, _c;
            const xata_classroom_id = ((_a = enrollment.classroom) === null || _a === void 0 ? void 0 : _a.id) || "123";
            const xata_classroom = XataRecords.classrooms.find((classroom) => classroom.id === xata_classroom_id);
            const xata_class_id = ((_b = xata_classroom === null || xata_classroom === void 0 ? void 0 : xata_classroom.class) === null || _b === void 0 ? void 0 : _b.id) || "123";
            const xata_class = XataRecords.classes.find((clase) => clase.id === xata_class_id);
            const xata_course_id = ((_c = xata_class === null || xata_class === void 0 ? void 0 : xata_class.course) === null || _c === void 0 ? void 0 : _c.id) || "123";
            const xata_course = XataRecords.courses.find((course) => course.id === xata_course_id);
            return ((xata_course === null || xata_course === void 0 ? void 0 : xata_course.handle) === score.enrollment.classroom.clase.course.handle);
        });
        if (!xata_enrollment) {
            throw new Error("Enrollment not found");
        }
        const xata_evaluation = XataRecords.evaluations.find((evaluation) => {
            var _a, _b;
            const xata_class_id = ((_a = evaluation.class) === null || _a === void 0 ? void 0 : _a.id) || "123";
            const xata_class = XataRecords.classes.find((clase) => clase.id === xata_class_id);
            const xata_course_id = ((_b = xata_class === null || xata_class === void 0 ? void 0 : xata_class.course) === null || _b === void 0 ? void 0 : _b.id) || "123";
            const xata_course = XataRecords.courses.find((course) => course.id === xata_course_id);
            return ((xata_course === null || xata_course === void 0 ? void 0 : xata_course.handle) === score.evaluation.clase.course.handle &&
                evaluation.name === score.evaluation.name);
        });
        if (!xata_evaluation) {
            throw new Error("Evaluation not found");
        }
        const scores_matched = await Xata.db.score
            .filter({
            "enrollment.id": xata_enrollment.id,
        })
            .filter({
            "evaluation.id": xata_evaluation.id,
        })
            .getMany();
        if (scores_matched.length > 0) {
            return scores_matched[0];
        }
        else {
            return (await Xata.db.score.create({
                enrollment: xata_enrollment.id,
                evaluation: xata_evaluation.id,
                raw_grades: score.grades.join(","),
            }));
        }
    })));
};