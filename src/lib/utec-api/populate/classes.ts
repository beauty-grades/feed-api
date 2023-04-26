// 1st level classes
export class LocalCurriculum {
  constructor(handle: string) {
    this.handle = handle
  }

  handle: string
}

export class LocalPeriod {
  constructor(handle: string) {
    this.handle = handle
  }

  handle: string
}

export class LocalCourse {
  constructor(handle: string, name: string) {
    this.handle = handle
    this.name = name
  }

  handle: string
  name: string
}

export class LocalStudent {
  constructor(email: string) {
    this.email = email
  }

  email: string
}

export class LocalTeacher {
  constructor(first_name: string, last_name: string) {
    this.first_name = first_name
    this.last_name = last_name
  }

  first_name: string
  last_name: string
}

// 2nd level classes
export class LocalLevel {
  constructor(number: number, curriculum: LocalCurriculum) {
    this.order = number
    this.curriculum = curriculum
  }

  order: number
  curriculum: LocalCurriculum
  elective_count: number | null = null

  setElectiveCount(count: number) {
    this.elective_count = count
  }
}

export class LocalClase {
  constructor(course: LocalCourse, period: LocalPeriod) {
    this.course = course
    this.period = period
  }

  course: LocalCourse
  period: LocalPeriod
  wrong_formula: boolean = false

  setWrongFormula() {
    this.wrong_formula = true
  }
}

export class LocalStudent_Curriculum {
  constructor(student: LocalStudent, curriculum: LocalCurriculum) {
    this.student = student
    this.curriculum = curriculum
  }

  student: LocalStudent
  curriculum: LocalCurriculum
}

// 3rd level classes
export class LocalLevel_Course {
  constructor(level: LocalLevel, course: LocalCourse, credits: number) {
    this.level = level
    this.course = course
    this.credits = credits
  }

  level: LocalLevel
  course: LocalCourse
  credits: number
}

export class LocalClassroom {
  constructor(section: number, clase: LocalClase, teacher: LocalTeacher) {
    this.section = section
    this.clase = clase
    this.teacher = teacher
    this.score = null
  }

  section: number
  clase: LocalClase
  teacher: LocalTeacher
  score: number | null

  setScore(score: number) {
    this.score = score
  }
}

export class LocalEvaluation {
  constructor(
    handle: string,
    label: string,
    weight: number | null,
    can_be_deleted: boolean,
    clase: LocalClase
  ) {
    this.handle = handle
    this.label = label
    this.weight = weight
    this.can_be_deleted = can_be_deleted
    this.clase = clase
  }

  handle: string
  label: string
  weight: number | null
  can_be_deleted: boolean
  clase: LocalClase
}

// 4th level classes
export class LocalEnrollment {
  constructor(
    student: LocalStudent,
    classroom: LocalClassroom,
    final_score: number | null,
    dropped_out: boolean,
    elective: boolean

  ) {
    this.student = student
    this.classroom = classroom
    this.final_score = final_score 
    this.dropped_out = dropped_out
    this.elective = elective
  }

  student: LocalStudent
  classroom: LocalClassroom
  final_score: number | null
  dropped_out: boolean
  elective: boolean
}

// 5th level classes
export class LocalGrade {
  constructor(
    evaluation: LocalEvaluation,
    enrollment: LocalEnrollment,
    score: number | null
  ) {
    this.evaluation = evaluation
    this.enrollment = enrollment
    this.score = score
  }

  evaluation: LocalEvaluation
  enrollment: LocalEnrollment
  score: number | null
}
