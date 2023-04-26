export interface RawCurriculumFetched {
  academicProgramId: number
  tittle: string
}

export interface RawLevelFromCurriculumFetched {
  title: string
  courses: {
    codeCourse: string
    course: string
    idCourse: number
    nameTeacher: string
    times: number
    summaryEnrolled: {
      idPeriod: number
      namePeriod: string
      finalNote: number
      classroomAverage: number
      absences: string
    }[]
    beforeCourses: {
      codeCourse: string
      course: string
      idCourse: number
    }[]
    afterCourses: {
      codeCourse: string
      course: string
      idCourse: number
    }[]
    section: string
    credits: number
    score: string
    status: string
    period: string
    syllabus?: any
    isElective: boolean
  }[]
}

export interface RawPeriodFetched {
  codPeriodo: number
  descPeriodo: string
  fechaPeriodo: string
  codProducto: number
  descProducto: string
  retirado: boolean
  idAlumno: string
}

export interface RawCourseFromPeriodFetched {
  codeCourse: number
  idCourse: string
  titleCourse: string
  teacher: string
  finalScore: string
  credits: number
  level: string
  times: number
  section: string
  comments: string
  formula: string
  sectionName: string
  bellNumber: number
  courseModality: string
  scores: {
    codCourseTypeNote: number
    numSequence: number
    weight: number
    codCourseForm: number
    name: string
    codCourseSesion: number
    score: string
    delete: boolean
    sesion: string
    code: string
  }[]
}
