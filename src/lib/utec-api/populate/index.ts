import Xata from "../../xata";
import {
  ClassRecord,
  ClassroomRecord,
  CourseRecord,
  CurriculumRecord,
  EnrollmentRecord,
  EvaluationRecord,
  GradeRecord,
  LevelCourseRecord,
  LevelRecord,
  PeriodRecord,
  StudentCurriculumRecord,
  StudentRecord,
  TeacherRecord,
} from "../../xata/codegen";
import {
  LocalClase,
  LocalClassroom,
  LocalCourse,
  LocalCurriculum,
  LocalEnrollment,
  LocalEvaluation,
  LocalGrade,
  LocalLevel,
  LocalLevel_Course,
  LocalPeriod,
  LocalStudent,
  LocalStudent_Curriculum,
  LocalTeacher,
} from "./classes";
import { CustomExecuteParallel } from "./custom-execute-parallel";
import {
  RawCourseFromPeriodFetched,
  RawCurriculumFetched,
  RawLevelFromCurriculumFetched,
  RawPeriodFetched,
} from "./interfaces";
import { parseEvaluations } from "./parse-evaluations";
import { retryFetch } from "./retry-fetch";

export const populate = async (utec_token_v1: string, email: string) => {
  const LocalRecords = {
    curriculums: [] as LocalCurriculum[],
    periods: [] as LocalPeriod[],
    courses: [] as LocalCourse[],
    student: {} as LocalStudent,
    teachers: [] as LocalTeacher[],
    levels: [] as LocalLevel[],
    clases: [] as LocalClase[],
    student_curriculums: [] as LocalStudent_Curriculum[],
    level_courses: [] as LocalLevel_Course[],
    classrooms: [] as LocalClassroom[],
    evaluations: [] as LocalEvaluation[],
    enrollments: [] as LocalEnrollment[],
    grades: [] as LocalGrade[],
  };

  let temp_classrooms_scores: {
    course_handle: string;
    period_handle: string;
    classroom_score: number;
  }[] = [];

  LocalRecords.student = new LocalStudent(email);

  await Promise.all([
    // Curriculums
    (async () => {
      const res_get_curriculums = await fetch(
        "https://api.utec.edu.pe/academico-api/core/filtromalla/student/academic_programs?program=1",
        {
          headers: {
            "x-auth-token": utec_token_v1,
          },
        }
      );
      const json = await res_get_curriculums.json();
      const fetched_curriculums = json.content as RawCurriculumFetched[];

      await Promise.all(
        fetched_curriculums.map(async ({ academicProgramId, tittle }) => {
          const current_curriculum = new LocalCurriculum(tittle);
          LocalRecords.curriculums.push(current_curriculum);

          const current_student_curriculum = new LocalStudent_Curriculum(
            LocalRecords.student,
            current_curriculum
          );

          LocalRecords.student_curriculums.push(current_student_curriculum);

          const res_get_curriculum = await fetch(
            "https://api.utec.edu.pe/academico-api/alumnos/me/web/academic/curriculum",
            {
              method: "POST",
              headers: {
                "x-auth-token": utec_token_v1,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                academicProgramId: academicProgramId,
              }),
            }
          );
          const json = await res_get_curriculum.json();

          const fetched_levels = json.content
            .academicCurriculum as RawLevelFromCurriculumFetched[];

          fetched_levels.map(({ title, courses: raw_courses }) => {
            const current_level = new LocalLevel(
              parseInt(title.split(" ")[1]),
              current_curriculum
            );
            LocalRecords.levels.push(current_level);

            let elective_count: number = 0;

            raw_courses.forEach((course) => {
              if (course.isElective) {
                elective_count++;
              } else {
                let classroom_score =
                  course.summaryEnrolled[0]?.classroomAverage;
                let xd_period = course.summaryEnrolled[0]?.namePeriod.replace(
                  /\s/g,
                  ""
                );

                if (classroom_score) {
                  temp_classrooms_scores.push({
                    course_handle: course.codeCourse.trim(),
                    period_handle: xd_period,
                    classroom_score,
                  });
                }

                // Check if course is in courses array
                const parsed_handle = course.codeCourse.trim();
                const parsed_name = course.course.trim();

                let current_course = LocalRecords.courses.find(
                  (course) => course.handle === parsed_handle
                );

                if (!current_course) {
                  current_course = new LocalCourse(parsed_handle, parsed_name);
                  LocalRecords.courses.push(current_course);
                }

                const current_level_course = new LocalLevel_Course(
                  current_level,
                  current_course,
                  course.credits
                );
                LocalRecords.level_courses.push(current_level_course);
              }
            });

            if (elective_count > 0) {
              current_level.setElectiveCount(elective_count);
            }
          });
        })
      );
    })(),
    (async () => {
      const res_get_periods = await fetch(
        "https://api.utec.edu.pe/academico-api/alumnos/me/periodosPorAlumno",
        {
          method: "POST",
          headers: {
            "x-auth-token": utec_token_v1,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hello: "world",
          }),
        }
      );

      const json = await res_get_periods.json();
      const fetched_periods = json.content as RawPeriodFetched[];

      const handlePeriod = async ({ codPeriodo, descPeriodo }) => {
        const current_period = new LocalPeriod(descPeriodo.replaceAll(" ", ""));
        LocalRecords.periods.push(current_period);

        const res_get_period = await retryFetch(
          `https://api.utec.edu.pe/academico-api/alumnos/me/course/details`,
          {
            method: "POST",
            headers: {
              "x-auth-token": utec_token_v1,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              period: codPeriodo,
              program: "1",
            }),
          }
        );
        const json = await res_get_period.json();
        const fetched_courses = json.content as RawCourseFromPeriodFetched[];

        if (fetched_courses.length && fetched_courses.length > 0) {
          fetched_courses.forEach((course) => {
            // Check if course is in courses array

            const parsed_handle = course.idCourse.trim();
            const parsed_title = course.titleCourse.trim();

            let current_course = LocalRecords.courses.find(
              (c) => c.handle === parsed_handle
            );
            if (!current_course) {
              current_course = new LocalCourse(parsed_handle, parsed_title);
              LocalRecords.courses.push(current_course);
            }

            const current_clase = new LocalClase(
              current_course,
              current_period
            );
            LocalRecords.clases.push(current_clase);

            let [first_name, last_name] = course.teacher.split(", ");
            first_name = first_name.trim();
            last_name = last_name.trim();

            let current_teacher = LocalRecords.teachers.find(
              (teacher) =>
                teacher.first_name === first_name &&
                teacher.last_name === last_name
            );

            if (!current_teacher) {
              current_teacher = new LocalTeacher(first_name, last_name);
              LocalRecords.teachers.push(current_teacher);
            }

            const current_classroom = new LocalClassroom(
              parseInt(course.sectionName),
              current_clase,
              current_teacher
            );

            LocalRecords.classrooms.push(current_classroom);

            const dropped_out = course.finalScore === "RET";
            const elective = course.level === "-" && course.credits === 3;
            const final_score = dropped_out
              ? null
              : parseFloat(course.finalScore);

            const current_enrollment = new LocalEnrollment(
              LocalRecords.student,
              current_classroom,
              final_score,
              dropped_out,
              elective
            );
            LocalRecords.enrollments.push(current_enrollment);

            if (course.scores.length && course.scores.length > 0) {
              const { evaluations: parsed_evaluations, wrong_formula } =
                parseEvaluations(course.scores, course.formula);

              if (wrong_formula) {
                current_clase.setWrongFormula();
              }

              parsed_evaluations.forEach(
                ({ handle, label, weight, can_be_deleted, score }) => {
                  const current_evaluation = new LocalEvaluation(
                    handle,
                    label,
                    weight,
                    can_be_deleted,
                    current_clase
                  );
                  LocalRecords.evaluations.push(current_evaluation);

                  if (score) {
                    const current_score = new LocalGrade(
                      current_evaluation,
                      current_enrollment,
                      score
                    );
                    LocalRecords.grades.push(current_score);
                  }
                }
              );
            }
          });
        }
      };
      const start = Date.now();

      console.log(fetched_periods.map(({ codPeriodo }) => codPeriodo));
      // jeje
      await CustomExecuteParallel(fetched_periods, handlePeriod);
      // pipi
      const end = Date.now();
      const elapsedSeconds = Math.floor((start - end) / 1000);
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;

      console.log(
        `Fetch periods took: ${minutes}:${seconds.toString().padStart(2, "0")}`
      );
    })(),
  ]);

  temp_classrooms_scores.forEach((temp_classroom) => {
    const matched_classroom = LocalRecords.classrooms.find(
      (classroom) =>
        classroom.clase.course.handle === temp_classroom.course_handle &&
        classroom.clase.period.handle === temp_classroom.period_handle
    );

    if (matched_classroom) {
      matched_classroom.setScore(temp_classroom.classroom_score);
    }
  });

  // Registering in Xata

  let XataRecords = {} as {
    curriculums: CurriculumRecord[];
    periods: PeriodRecord[];
    courses: CourseRecord[];
    student: StudentRecord;
    teachers: TeacherRecord[];
    levels: LevelRecord[];
    classes: ClassRecord[];
    student_curriculums: StudentCurriculumRecord[];
    level_courses: LevelCourseRecord[];
    evaluations: EvaluationRecord[];
    classrooms: ClassroomRecord[];
    enrollments: EnrollmentRecord[];
    grades: GradeRecord[];
  };

  // 1st level of parallelism
  await Promise.all([
    // Register Curriculums
    (async () => {
      XataRecords.curriculums = await Promise.all(
        LocalRecords.curriculums.map(async (local_curriculum) => {
          const curriculums_matched = await Xata.db.curriculum
            .filter({
              handle: local_curriculum.handle,
            })
            .getMany();

          if (curriculums_matched.length > 0) {
            return curriculums_matched[0];
          } else {
            return await Xata.db.curriculum.create({
              handle: local_curriculum.handle,
            });
          }
        })
      );
    })(),

    // Register Periods
    (async () => {
      XataRecords.periods = await Promise.all(
        LocalRecords.periods.map(async (local_period) => {
          const periods_matched = await Xata.db.period
            .filter({
              handle: local_period.handle,
            })
            .getMany();

          if (periods_matched.length > 0) {
            return periods_matched[0];
          } else {
            return await Xata.db.period.create({
              handle: local_period.handle,
            });
          }
        })
      );
    })(),

    // Register Courses
    (async () => {
      XataRecords.courses = await Promise.all(
        LocalRecords.courses.map(async (local_course) => {
          const courses_matched = await Xata.db.course
            .filter({
              handle: local_course.handle,
            })
            .getMany();

          if (courses_matched.length > 0) {
            return courses_matched[0];
          } else {
            return await Xata.db.course.create({
              handle: local_course.handle,
              name: local_course.name,
            });
          }
        })
      );
    })(),

    // Register Student
    (async () => {
      let student_matched = await Xata.db.student
        .filter({
          email: LocalRecords.student.email,
        })
        .getMany();

      if (student_matched.length > 0) {
        XataRecords.student = student_matched[0];
      } else {
        XataRecords.student = await Xata.db.student.create({
          email: LocalRecords.student.email,
        });
      }
    })(),

    // Register Teachers
    (async () => {
      XataRecords.teachers = await Promise.all(
        LocalRecords.teachers.map(async (local_teacher) => {
          const teachers_matched = await Xata.db.teacher
            .filter({
              first_name: local_teacher.first_name,
            })
            .filter({
              last_name: local_teacher.last_name,
            })
            .getMany();

          if (teachers_matched.length > 0) {
            return teachers_matched[0];
          } else {
            return await Xata.db.teacher.create({
              first_name: local_teacher.first_name,
              last_name: local_teacher.last_name,
            });
          }
        })
      );
    })(),
  ]);

  // 2nd level of parallelism

  await Promise.all([
    // Register Levels
    (async () => {
      XataRecords.levels = await Promise.all(
        LocalRecords.levels.map(async (loca_level) => {
          const xata_curriculum_matching = XataRecords.curriculums.find(
            (xata_curriculum) =>
              xata_curriculum.handle === loca_level.curriculum.handle
          );
          if (!xata_curriculum_matching) {
            throw new Error("Curriculum not found");
          }

          const levels_matched = await Xata.db.level
            .select(["*", "curriculum.*"])
            .filter({
              "curriculum.id": xata_curriculum_matching.id,
            })
            .filter({
              order: loca_level.order,
            })
            .getMany();

          if (levels_matched.length > 0) {
            return levels_matched[0];
          } else {
            const xata_level = await Xata.db.level.create({
              order: loca_level.order,
              curriculum: xata_curriculum_matching.id,
              elective_count: loca_level.elective_count,
            });

            const fixed_xata_level = JSON.parse(JSON.stringify(xata_level));
            fixed_xata_level.curriculum.handle = loca_level.curriculum.handle;

            return fixed_xata_level;
          }
        })
      );
    })(),

    // Register Classes
    (async () => {
      XataRecords.classes = await Promise.all(
        LocalRecords.clases.map(async (local_clase) => {
          const xata_course_matching = XataRecords.courses.find(
            (xata_course) => xata_course.handle === local_clase.course.handle
          );

          if (!xata_course_matching) {
            throw new Error("Course not found");
          }
          const xata_period_matching = XataRecords.periods.find(
            (xata_period) => xata_period.handle === local_clase.period.handle
          );
          if (!xata_period_matching) {
            throw new Error("Period not found");
          }

          const classes_matched = await Xata.db.class
            .filter({
              "course.id": xata_course_matching.id,
            })
            .filter({
              "period.id": xata_period_matching.id,
            })
            .getMany();

          if (classes_matched.length > 0) {
            return classes_matched[0] as unknown as ClassRecord;
          } else {
            return (await Xata.db.class.create({
              course: xata_course_matching.id,
              period: xata_period_matching.id,
              wrong_formula: local_clase.wrong_formula,
            })) as unknown as ClassRecord;
          }
        })
      );
    })(),

    // Register StudentCurriculums
    (async () => {
      XataRecords.student_curriculums = (await Promise.all(
        LocalRecords.student_curriculums.map(async (student_curriculum) => {
          const xata_student = XataRecords.student;
          if (!xata_student) {
            throw new Error("Student not found");
          }

          const xata_curriculum_matching = XataRecords.curriculums.find(
            (xata_curriculum) =>
              xata_curriculum.handle === student_curriculum.curriculum.handle
          );
          if (!xata_curriculum_matching) {
            throw new Error("Curriculum not found");
          }

          const student_curriculums_matched = await Xata.db.student_curriculum
            .filter({
              "student.id": xata_student.id,
            })
            .filter({
              "curriculum.id": xata_curriculum_matching.id,
            })
            .getMany();

          if (student_curriculums_matched.length > 0) {
            return student_curriculums_matched[0];
          } else {
            return await Xata.db.student_curriculum.create({
              student: xata_student.id,
              curriculum: xata_curriculum_matching.id,
            });
          }
        })
      )) as unknown as StudentCurriculumRecord[];
    })(),
  ]);

  // 3rd level of parallelism

  await Promise.all([
    // Register LevelCourses
    (async () => {
      XataRecords.level_courses = await Promise.all(
        LocalRecords.level_courses.map(async (level_course) => {
          const xata_level_matching = XataRecords.levels.find(
            (xata_level) =>
              xata_level.order === level_course.level.order &&
              xata_level.curriculum?.handle ===
                level_course.level.curriculum.handle
          );
          if (!xata_level_matching) {
            throw new Error("Level not found");
          }

          const xata_course_matching = XataRecords.courses.find(
            (course) => course.handle === level_course.course.handle
          );
          if (!xata_course_matching) {
            throw new Error("Course not found");
          }

          const level_courses_matched = await Xata.db.level_course
            .filter({
              "level.id": xata_level_matching.id,
            })
            .filter({
              "course.id": xata_course_matching.id,
            })
            .getMany();

          if (level_courses_matched.length > 0) {
            return level_courses_matched[0] as unknown as LevelCourseRecord;
          } else {
            return (await Xata.db.level_course.create({
              level: xata_level_matching.id,
              course: xata_course_matching.id,
              credits: level_course.credits,
            })) as unknown as LevelCourseRecord;
          }
        })
      );
    })(),

    // Register Evaluations
    (async () => {
      XataRecords.evaluations = (await Promise.all(
        LocalRecords.evaluations.map(async (evaluation) => {
          const xata_class = XataRecords.classes.find((clase) => {
            const xata_course_id = clase.course?.id || "123";
            const xata_course = XataRecords.courses.find(
              (course) => course.id === xata_course_id
            );

            const xata_period_id = clase.period?.id || "123";
            const xata_period = XataRecords.periods.find(
              (period) => period.id === xata_period_id
            );

            return (
              xata_course?.handle === evaluation.clase.course.handle &&
              xata_period?.handle === evaluation.clase.period.handle
            );
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
              label: evaluation.label,
            })
            .getMany();

          if (evaluations_matched.length > 0) {
            return evaluations_matched[0];
          } else {
            return await Xata.db.evaluation.create({
              handle: evaluation.handle,
              label: evaluation.label,
              class: xata_class.id,
              weight: evaluation.weight,
              can_be_deleted: evaluation.can_be_deleted,
            });
          }
        })
      )) as unknown as EvaluationRecord[];
    })(),

    // Register Classrooms
    (async () => {
      XataRecords.classrooms = await Promise.all(
        LocalRecords.classrooms.map(async (classroom) => {
          const xata_class = XataRecords.classes.find((clase) => {
            const xata_course_id = clase.course?.id || "123";
            const xata_course = XataRecords.courses.find(
              (course) => course.id === xata_course_id
            );

            const xata_period_id = clase.period?.id || "123";
            const xata_period = XataRecords.periods.find(
              (period) => period.id === xata_period_id
            );

            return (
              xata_course?.handle === classroom.clase.course.handle &&
              xata_period?.handle === classroom.clase.period.handle
            );
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
            return classrooms_matched[0] as unknown as ClassroomRecord;
          } else {
            const xata_teacher = XataRecords.teachers.find(
              (teacher) =>
                teacher.first_name === classroom.teacher.first_name &&
                teacher.last_name === classroom.teacher.last_name
            );

            return (await Xata.db.classroom.create({
              section: classroom.section,
              class: xata_class.id,
              teacher: xata_teacher?.id,
              score: classroom.score,
            })) as unknown as ClassroomRecord;
          }
        })
      );
    })(),
  ]);

  // 4th level of parallelism

  XataRecords.enrollments = await Promise.all(
    LocalRecords.enrollments.map(async (local_enrollment) => {
      const xata_student = XataRecords.student;
      if (!xata_student) {
        throw new Error("Student not found");
      }

      const xata_classroom = XataRecords.classrooms.find((classroom) => {
        const xata_class_id = classroom.class?.id || "123";
        const xata_class = XataRecords.classes.find(
          (clase) => clase.id === xata_class_id
        );

        const xata_course_id = xata_class?.course?.id || "123";
        const xata_course = XataRecords.courses.find(
          (course) => course.id === xata_course_id
        );

        const xata_period_id = xata_class?.period?.id || "123";
        const xata_period = XataRecords.periods.find(
          (period) => period.id === xata_period_id
        );

        return (
          xata_course?.handle ===
            local_enrollment.classroom.clase.course.handle &&
          xata_period?.handle === local_enrollment.classroom.clase.period.handle
        );
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
        return enrollments_matched[0] as unknown as EnrollmentRecord;
      } else {
        return (await Xata.db.enrollment.create({
          student: xata_student.id,
          classroom: xata_classroom.id,
          final_score: local_enrollment.final_score,
          dropped_out: local_enrollment.dropped_out,
          elective: local_enrollment.elective,
        })) as unknown as EnrollmentRecord;
      }
    })
  );

  // 5th level of parallelism
  XataRecords.grades = await Promise.all(
    LocalRecords.grades.map(async (score) => {
      const xata_enrollment = XataRecords.enrollments.find((enrollment) => {
        const xata_classroom_id = enrollment.classroom?.id || "123";
        const xata_classroom = XataRecords.classrooms.find(
          (classroom) => classroom.id === xata_classroom_id
        );

        const xata_class_id = xata_classroom?.class?.id || "123";
        const xata_class = XataRecords.classes.find(
          (clase) => clase.id === xata_class_id
        );

        const xata_course_id = xata_class?.course?.id || "123";
        const xata_course = XataRecords.courses.find(
          (course) => course.id === xata_course_id
        );

        const xata_period_id = xata_class?.period?.id || "123";
        const xata_period = XataRecords.periods.find(
          (period) => period.id === xata_period_id
        );

        return (
          xata_course?.handle ===
            score.enrollment.classroom.clase.course.handle &&
          xata_period?.handle === score.enrollment.classroom.clase.period.handle
        );
      });

      if (!xata_enrollment) {
        throw new Error("Enrollment not found");
      }

      const xata_evaluation = XataRecords.evaluations.find((evaluation) => {
        const xata_class_id = evaluation.class?.id || "123";
        const xata_class = XataRecords.classes.find(
          (clase) => clase.id === xata_class_id
        );

        const xata_course_id = xata_class?.course?.id || "123";
        const xata_course = XataRecords.courses.find(
          (course) => course.id === xata_course_id
        );

        const xata_period_id = xata_class?.period?.id || "123";
        const xata_period = XataRecords.periods.find(
          (period) => period.id === xata_period_id
        );

        return (
          xata_course?.handle === score.evaluation.clase.course.handle &&
          xata_period?.handle === score.evaluation.clase.period.handle &&
          evaluation.label === score.evaluation.label &&
          evaluation.handle === score.evaluation.handle
        );
      });

      if (!xata_evaluation) {
        throw new Error("Evaluation not found");
      }

      const scores_matched = await Xata.db.grade
        .filter({
          "enrollment.id": xata_enrollment.id,
        })
        .filter({
          "evaluation.id": xata_evaluation.id,
        })
        .getMany();

      if (scores_matched.length > 0) {
        return scores_matched[0] as unknown as GradeRecord;
      } else {
        return (await Xata.db.grade.create({
          enrollment: xata_enrollment.id,
          evaluation: xata_evaluation.id,
          score: score.score,
        })) as unknown as GradeRecord;
      }
    })
  );

  return [LocalRecords];
};
