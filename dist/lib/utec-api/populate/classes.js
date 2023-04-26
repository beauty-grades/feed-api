// 1st level classes
export class LocalCurriculum {
    constructor(handle) {
        this.handle = handle;
    }
}
export class LocalPeriod {
    constructor(handle) {
        this.handle = handle;
    }
}
export class LocalCourse {
    constructor(handle, name) {
        this.handle = handle;
        this.name = name;
    }
}
export class LocalStudent {
    constructor(email) {
        this.email = email;
    }
}
export class LocalTeacher {
    constructor(first_name, last_name) {
        this.first_name = first_name;
        this.last_name = last_name;
    }
}
// 2nd level classes
export class LocalLevel {
    constructor(number, curriculum) {
        this.elective_count = null;
        this.order = number;
        this.curriculum = curriculum;
    }
    setElectiveCount(count) {
        this.elective_count = count;
    }
}
export class LocalClase {
    constructor(course, period) {
        this.wrong_formula = false;
        this.course = course;
        this.period = period;
    }
    setWrongFormula() {
        this.wrong_formula = true;
    }
}
export class LocalStudent_Curriculum {
    constructor(student, curriculum) {
        this.student = student;
        this.curriculum = curriculum;
    }
}
// 3rd level classes
export class LocalLevel_Course {
    constructor(level, course, credits) {
        this.level = level;
        this.course = course;
        this.credits = credits;
    }
}
export class LocalClassroom {
    constructor(section, clase, teacher) {
        this.section = section;
        this.clase = clase;
        this.teacher = teacher;
        this.score = null;
    }
    setScore(score) {
        this.score = score;
    }
}
export class LocalEvaluation {
    constructor(handle, label, weight, can_be_deleted, clase) {
        this.handle = handle;
        this.label = label;
        this.weight = weight;
        this.can_be_deleted = can_be_deleted;
        this.clase = clase;
    }
}
// 4th level classes
export class LocalEnrollment {
    constructor(student, classroom, final_score, dropped_out, elective) {
        this.student = student;
        this.classroom = classroom;
        this.final_score = final_score;
        this.dropped_out = dropped_out;
        this.elective = elective;
    }
}
// 5th level classes
export class LocalGrade {
    constructor(evaluation, enrollment, score) {
        this.evaluation = evaluation;
        this.enrollment = enrollment;
        this.score = score;
    }
}
