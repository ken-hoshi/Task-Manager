import { clientSupabase } from "../supabase/client";

enum Target {
  smallProject,
  task,
}

export async function fetchAttachedFiles(
  target: number,
  ids: number[]
): Promise<{ id: number; fileDataArray: { file: File; url: string }[] }[]> {
  try {
    const tableName =
      target === Target.smallProject
        ? "small_project_attachments"
        : "task_attachments";
    const idField =
      target === Target.smallProject ? "small_project_id" : "task_id";

    const { data: attachments, error } = await clientSupabase
      .from(tableName)
      .select("*")
      .in(idField, ids);

    if (error) {
      throw error;
    }

    if (!attachments || attachments.length === 0) {
      return ids.map((id) => ({ id, fileDataArray: [] }));
    }

    const groupedAttachments = ids.map((id) => ({
      id,
      attachments: attachments.filter(
        (attachment) => attachment[idField] === id
      ),
    }));

    const result = await Promise.all(
      groupedAttachments.map(async ({ id, attachments }) => {
        const files = await Promise.all(
          attachments.map(async (attached) => {
            const { data: fileData, error: fileError } =
              await clientSupabase.storage
                .from(tableName)
                .download(attached.file_path);

            if (fileError) {
              console.error(`Downloading File for ID ${id}`, fileError);
              return null;
            }

            if (fileData) {
              const fileName = attached.file_name || "unknown";

              const file = new File([fileData], fileName, {
                type: fileData.type,
              });
              try {
                const url = URL.createObjectURL(file);
                return { file: file, url: url };
              } catch (error) {
                console.error("Failed to create object URL", error);
                return null;
              }
            }

            return null;
          })
        );

        return {
          id,
          fileDataArray: files.filter((file) => file !== null) as {
            file: File;
            url: string;
          }[],
        };
      })
    );
    return result;
  } catch (error) {
    console.error("Fetch Attached Files", error);
    return ids.map((id) => ({ id, fileDataArray: [] }));
  }
}
