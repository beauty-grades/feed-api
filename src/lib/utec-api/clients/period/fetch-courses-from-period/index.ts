import { retryFetch } from "../../../../utils/retry-fetch";
import { type RawCourseFromPeriodFetched } from "./interface";

export const fetchCoursesFromPeriod = async ({
  utec_token_v1,
  period_utec_id,
}: {
  utec_token_v1: string;
  period_utec_id: number;
}): Promise<RawCourseFromPeriodFetched[]> => {
  const res_get_period = await retryFetch(
    `https://api.utec.edu.pe/academico-api/alumnos/me/course/details`,
    {
      method: "POST",
      headers: {
        "x-auth-token": utec_token_v1,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        period: period_utec_id,
        program: "1",
      }),
    }
  );
  const json = await res_get_period.json();
  const fetched_courses = json.content as RawCourseFromPeriodFetched[];

  return fetched_courses;
};
