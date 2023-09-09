import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import Xata from "./lib/xata";
import { MetadataClient } from "./lib/utec-api/clients/metadata";
import { CurriculumClient } from "./lib/utec-api/clients/curriculum";
import { PeriodClient } from "./lib/utec-api/clients/period";
import { fetchPeriods } from "./lib/utec-api/fetch-periods";
import { getStudent } from "./lib/utec-api/fetch-student";
import { CustomExecuteParallel } from "./lib/utils/custom-execute-parallel";

const app = express();
const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: [
      "https://sistema-academico.utec.edu.pe",
      "https://coollege.vercel.app",
    ],
  })
);

app.use(bodyParser.json());

app.post("/api/feed", async (req, res) => {
  const utec_token_v1 = req.body.tokenV1;
  const utec_token_v2 = req.body.tokenV2;

  let local_student: {
    email: string;
    order_merit: number;
    score: number;
    utec_id: string;
    first_name: string;
  } | null = null;
  try {
    if (!utec_token_v1) {
      throw new Error("Bad Request: tokenV1 is missing");
    }
    if (!utec_token_v2) {
      throw new Error("Bad Request: tokenV2 is missing");
    }

    local_student = await getStudent({ utec_token_v2 });

    let metadata_record = await Xata.db.metadata
      .filter({
        email: local_student.email,
      })
      .getFirst();

    if (!metadata_record) {
      metadata_record = await Xata.db.metadata.create({
        email: local_student.email,
        feeding: true,
      });
    } else {
      if (metadata_record.feeding) {
        res
          .status(200)
          .json(
            "Hey! We are already feeding your information. Please wait a few minutes"
          );
        return;
      } else if (
        metadata_record.last_fed_at &&
        new Date().getTime() - metadata_record.last_fed_at.getTime() <
          1000 * 60 * 60 * 24 * 7
      ) {
        throw new Error("Forbidden: You can only feed once a week");
      }

      metadata_record.update({
        feeding: true,
      });
    }

    res
      .status(200)
      .json(
        `Hey ${local_student.first_name}! We started feeding your information. Please wait a few minutes`
      );
  } catch (error) {
    let status = 500;

    if (error.message.includes("Bad Request")) {
      status = 400;
    } else if (error.message.includes("Unauthorized")) {
      status = 401;
    } else if (error.message.includes("Forbidden")) {
      status = 403;
    } else if (error.message.includes("Not Found")) {
      status = 404;
    }

    res.status(status).json(error.message);

    return;
  }

  try {
    const current_period_id = process.env.CURRENT_PERIOD_ID;

    // Metadata thing
    const metadata_client = new MetadataClient({
      utec_token_v1,
    });
    await metadata_client.init();

    const last_period_enrolled = metadata_client.last_period;

    const meta_last_period = metadata_client.periods.get(last_period_enrolled);

    let career = await Xata.db.career
      .filter({ name: meta_last_period.career })
      .getFirst();
    if (!career) {
      career = await Xata.db.career.create({
        id: meta_last_period.curriculum.split("-")[0],
        name: meta_last_period.career,
      });
    }

    // Curriculum thing
    const curriculum_client = new CurriculumClient({
      utec_token_v1,
      curriculum_id: meta_last_period.curriculum,
    });
    await curriculum_client.init();

    let existing_student = true;
    let utec_account = await Xata.db.utec_account.read(local_student.utec_id);
    if (!utec_account) {
      existing_student = false;
      utec_account = await Xata.db.utec_account.create({
        id: local_student.utec_id,
        email: local_student.email,
        score: local_student.score,
        merit_order: local_student.order_merit,
        curriculum: meta_last_period.curriculum,
      });
    }

    // Periods thing
    const periods = await fetchPeriods({ utec_token_v1 });

    const handlePeriod = async ({
      period_id,
      period_utec_id,
    }: {
      period_id: string;
      period_utec_id: number;
    }) => {
      let period_enrollment_existed = true;
      let period_enrollment = await Xata.db.period_enrollment.read(
        `${period_id}-${utec_account.id}`
      );

      if (!period_enrollment) {
        period_enrollment_existed = false;
      } else if (period_id !== current_period_id) {
        return;
      }

      const meta_period = metadata_client.periods.get(period_id);

      const period_client = new PeriodClient({
        utec_token_v1,
        period_id,
        period_utec_id,
      });
      await period_client.init();

      if (!period_enrollment_existed) {
        if (meta_period.curriculum !== meta_last_period.curriculum) {
          let other_career = await Xata.db.career
            .filter({ name: meta_period.career })
            .getFirst();
          if (!other_career) {
            career = await Xata.db.career.create({
              id: meta_period.curriculum.split("-")[0],
              name: meta_period.career,
            });
          }

          const other_curriculum_client = new CurriculumClient({
            utec_token_v1,
            curriculum_id: meta_period.curriculum,
          });
          await other_curriculum_client.init();
        }

        let rel_career_period = await Xata.db.rel_career_period.read(
          `${meta_period.curriculum.split("-")[0]}-${period_id}`
        );
        if (!rel_career_period) {
          rel_career_period = await Xata.db.rel_career_period.create({
            id: `${meta_period.curriculum.split("-")[0]}-${period_id}`,
            career: meta_period.curriculum.split("-")[0],
            period: period_id,
            enrolled_students: meta_period.total_students,
          });
        }

        period_enrollment = await Xata.db.period_enrollment.create({
          id: `${period_id}-${utec_account.id}`,
          period: period_id,
          utec_account: utec_account.id,
          merit_order: meta_period.merit_order,
          curriculum: meta_period.curriculum,
          score: meta_period.score,
        });
      } else {
        await Xata.db.period_enrollment.update(
          `${period_id}-${utec_account.id}`,
          {
            merit_order: meta_period.merit_order,
            score: meta_period.score,
          }
        );
      }

      await Promise.all(
        [...period_client.courses].map(async ([course_id, course_period]) => {
          let evaluations_existed = true;
          let course_existed = true;
          let class_existed = true;
          let grades_existed = true;
          let section_enrollment_existed = true;

          let some_evaluation_id = [...course_period.evaluations][0][0];
          let some_evaluation = await Xata.db.evaluation.read(
            `${course_id}-${period_id}-${some_evaluation_id}`
          );
          if (!some_evaluation) {
            evaluations_existed = false;
            grades_existed = false;
          } else {
            const some_grade = await Xata.db.grade.read(
              `${course_id}-${period_id}-${some_evaluation_id}-${utec_account.id}`
            );

            if (!some_grade) {
              grades_existed = false;
            }
          }

          if (!evaluations_existed) {
            let course = await Xata.db.course.read(course_id);

            if (!course) {
              course_existed = false;
              course = await Xata.db.course.create({
                id: course_id,
                name: course_period.name,
              });
            }

            let _class = await Xata.db.class.read(`${course_id}-${period_id}`);

            if (!_class) {
              class_existed = false;
              _class = await Xata.db.class.create({
                id: `${course_id}-${period_id}`,
                course: course.id,
                period: period_id,
                wrong_formula: course_period.wrong_formula,
              });
            }
          }

          let teacher = await Xata.db.teacher
            .filter({ name: course_period.teacher })
            .getFirst();
          if (!teacher) {
            teacher = await Xata.db.teacher.create({
              name: course_period.teacher,
            });
          }

          const course_curriculum = curriculum_client.courses.get(course_id);

          const section_score: number | null =
            course_curriculum?.period === period_id
              ? course_curriculum?.sections_score || null
              : null;

          let section_enrollment = await Xata.db.section_enrollment.read(
            `${course_id}-${period_id}-${utec_account.id}`
          );

          if (!section_enrollment) {
            section_enrollment_existed = false;

            let section = await Xata.db.section.read(
              `${course_id}-${period_id}-${course_period.section}`
            );

            if (!section) {
              section = await Xata.db.section.create({
                id: `${course_id}-${period_id}-${course_period.section}`,
                section: course_period.section,
                teacher: teacher.id,
                score: section_score,
                class: `${course_id}-${period_id}`,
              });
            } else if (section.score !== section_score) {
              section.update({
                score: section_score,
              });
            }

            section_enrollment = await Xata.db.section_enrollment.create({
              id: `${course_id}-${period_id}-${utec_account.id}`,
              period_enrollment: `${period_id}-${utec_account.id}`,
              section: `${course_id}-${period_id}-${course_period.section}`,
              score: course_period.score,
              dropped_out: course_period.dropped_out,
              elective: curriculum_client.electives.has(course_period.name),
            });
          } else if (
            section_enrollment.score !== course_period.score ||
            section_enrollment.dropped_out !== course_period.dropped_out
          ) {
            section_enrollment.update({
              score: course_period.score,
              dropped_out: course_period.dropped_out,
            });
          }

          await Promise.all(
            [...course_period.evaluations].map(
              async ([evaluation_id, raw_evaluation]) => {
                if (!evaluations_existed) {
                  await Xata.db.evaluation.create({
                    id: `${course_id}-${period_id}-${evaluation_id}`,
                    handle: evaluation_id,
                    label: raw_evaluation.label,
                    weight: raw_evaluation.weight,
                    can_be_deleted: raw_evaluation.can_be_deleted,
                    class: `${course_id}-${period_id}`,
                  });
                }

                if (!grades_existed) {
                  await Xata.db.grade.create({
                    id: `${course_id}-${period_id}-${evaluation_id}-${utec_account.id}`,
                    evaluation: `${course_id}-${period_id}-${evaluation_id}`,
                    section_enrollment: `${course_id}-${period_id}-${utec_account.id}`,
                    score: raw_evaluation.score,
                  });
                } else {
                  await Xata.db.grade.update(
                    `${course_id}-${period_id}-${evaluation_id}-${utec_account.id}`,
                    {
                      score: raw_evaluation.score,
                    }
                  );
                }
              }
            )
          );
        })
      );
    };

    await CustomExecuteParallel(
      periods,
      async ({ utec_id, id }: { utec_id: number; id: string }) =>
        await handlePeriod({ period_id: id, period_utec_id: utec_id })
    );

    utec_account.update({
      first_period: metadata_client.first_period,
      last_period: metadata_client.last_period,
    });

    const metadata_record = await Xata.db.metadata
      .filter({
        email: local_student.email,
      })
      .getFirst();

    if (metadata_record) {
      metadata_record.update({
        last_fed_at: new Date(),
        feeding: false,
      });
    }

    console.log("Done");
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => {
  console.log(`App listening at ${port}`);
});
