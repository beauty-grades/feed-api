import { LevelResponse } from "./interface";

export const fetchLevelsFromCurriculum = async ({
  utec_token_v1,
  curriculum_utec_id,
}: {
  utec_token_v1: string;
  curriculum_utec_id: number;
}) => {
  const res_get_curriculum = await fetch(
    "https://api.utec.edu.pe/academico-api/alumnos/me/web/academic/curriculum",
    {
      method: "POST",
      headers: {
        "x-auth-token": utec_token_v1,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        academicProgramId: curriculum_utec_id,
      }),
    }
  );
  const json = await res_get_curriculum.json();

  const fetched_levels = json.content.academicCurriculum;

  return fetched_levels as LevelResponse[]
};
