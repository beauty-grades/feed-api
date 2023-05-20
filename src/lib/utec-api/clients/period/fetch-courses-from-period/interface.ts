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