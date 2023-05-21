import { fetchCurriculumId } from "../../fetch-curriculum-utec-id";
import Xata from "../../../xata";
import { CurriculumRecord } from "../../../xata/codegen";
import { fetchLevelsFromCurriculum } from "./fetch-levels-from-curriculum";
import { LevelResponse } from "./fetch-levels-from-curriculum/interface";

interface Course {
  name: string;
  level: string;
  credits: number;
  period?: string;
  sections_score?: number | null;
}

interface Level {
  elective_count: number;
}

export class CurriculumClient {
  curriculum_id: string;
  utec_token_v1: string;
  curriculum: CurriculumRecord;
  levels = new Map<number, Level>();
  courses = new Map<string, Course>();
  electives = new Set<string>();
  is_new = false;
  private raw_levels: LevelResponse[];

  constructor({
    utec_token_v1,
    curriculum_id,
  }: {
    utec_token_v1: string;
    curriculum_id: string;
  }) {
    this.utec_token_v1 = utec_token_v1;
    this.curriculum_id = curriculum_id;
  }

  private async fetchData() {
    const raw_levels = await fetchLevelsFromCurriculum({
      utec_token_v1: this.utec_token_v1,
      curriculum_utec_id: this.curriculum.utec_id,
    });

    this.raw_levels = raw_levels;
  }

  async init() {
    let curriculum = await Xata.db.curriculum.read(this.curriculum_id);

    if (!curriculum) {
      const curriculum_utec_id = await fetchCurriculumId({
        utec_token_v1: this.utec_token_v1,
        curriculum_id: this.curriculum_id,
      });

      curriculum = await Xata.db.curriculum.create({
        id: this.curriculum_id,
        career: this.curriculum_id.split("-")[0],
        utec_id: curriculum_utec_id,
      });
      this.is_new = true;
    }

    this.curriculum = curriculum as unknown as CurriculumRecord;
    await this.fetchData();

    this.raw_levels.map(({ title, courses: raw_courses }) => {
      const order = parseInt(title.split(" ")[1]);
      let elective_count = 0;

      raw_courses.forEach(
        ({
          isElective,
          codeCourse: course_id,
          course: course_name,
          credits,
          nameCourseAssociate,
          summaryEnrolled,
        }) => {
          if (isElective) {
            elective_count += 1;
            this.electives.add(nameCourseAssociate);
          } else {
            let course: Course = {
              name: course_name,
              level: `${this.curriculum.id}-${order}`,
              credits,
            };

            if (summaryEnrolled.length > 0) {
              const { namePeriod, classroomAverage } = summaryEnrolled[0];
              course["sections_score"] = classroomAverage;
              course["period"] = namePeriod.replace(/\s/g, "");
            }

            this.courses.set(course_id, course);
          }
        }
      );

      this.levels.set(order, {
        elective_count,
      });
    });

    if (this.is_new) {
      await Xata.db.level.create(
        [...this.levels.entries()].map(([order, level]) => ({
          id: `${this.curriculum.id}-${order}`,
          curriculum: this.curriculum.id,
          order,
          elective_count: level.elective_count,
        })),
        ["id"]
      );
      try {
        await Xata.db.course.create(
          [...this.courses.entries()].map(([course_id, course]) => ({
            id: course_id,
            name: course.name,
          })),
          ["id"]
        );
      } catch (e) {
        await Promise.all(
          [...this.courses.entries()].map(async ([course_id, course]) => {
            const matched_course = await Xata.db.course.read(course_id);
            if (!matched_course) {
              await Xata.db.course.create({
                id: course_id,
                name: course.name,
              });
            }
          })
        );
      }

      await Xata.db.rel_level_course.create(
        [...this.courses.entries()].map(([course_id, course]) => ({
          level: course.level,
          course: course_id,
          credits: course.credits,
        })),
        ["id"]
      );
    }
  }
}
