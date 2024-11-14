import { clientSupabase } from "./supabase/client";

enum Target {
  project,
  task,
}

export async function fetchAttachedFiles(
  target: number,
  ids: number[]
): Promise<File[][]> {
  try {
    const attachedFilesData: File[][] = [];

    if (target === Target.project) {
      const { data: projectAttachments, error: selectProjectAttachmentsError } =
        await clientSupabase
          .from("project_attachments")
          .select("*")
          .in("project_id", ids);

      if (selectProjectAttachmentsError) {
        throw selectProjectAttachmentsError;
      }

      if (!projectAttachments || projectAttachments.length === 0) {
        return Array(ids.length).fill([]);
      }

      const groupedProjectAttachments = ids.map((id) =>
        projectAttachments.filter((attachment) => attachment.project_id === id)
      );

      for (const attachments of groupedProjectAttachments) {
        const downloadPromises = attachments.map(async (attached) => {
          const { data: fileData, error: fileError } =
            await clientSupabase.storage
              .from("project_attachments")
              .download(attached.file_path);

          if (fileError) {
            throw fileError;
          }

          if (fileData) {
            const fileName = attached.file_name || "unknown";
            return new File([fileData], fileName, {
              type: fileData.type,
            });
          }
          return null;
        });

        const files = (await Promise.all(downloadPromises)).filter(
          (file): file is File => file !== null
        );
        attachedFilesData.push(files);
      }
    } else if (target === Target.task) {
      const { data: taskAttachments, error: selectTaskAttachmentsError } =
        await clientSupabase
          .from("task_attachments")
          .select("*")
          .in("task_id", ids);

      if (selectTaskAttachmentsError) {
        throw selectTaskAttachmentsError;
      }

      if (!taskAttachments || taskAttachments.length === 0) {
        return Array(ids.length).fill([]);
      }

      const groupedTaskAttachments = ids.map((id) =>
        taskAttachments.filter((attachment) => attachment.task_id === id)
      );

      for (const attachments of groupedTaskAttachments) {
        const downloadPromises = attachments.map(async (attached) => {
          const { data: fileData, error: fileError } =
            await clientSupabase.storage
              .from("task_attachments")
              .download(attached.file_path);

          if (fileError) {
            throw fileError;
          }

          if (fileData) {
            const fileName = attached.file_name || "unknown";
            return new File([fileData], fileName, {
              type: fileData.type,
            });
          }
          return null;
        });

        const files = (await Promise.all(downloadPromises)).filter(
          (file): file is File => file !== null
        );
        attachedFilesData.push(files);
      }
    } else {
      throw new Error("Task ID & Project ID are null.");
    }

    return attachedFilesData;
  } catch (error) {
    console.error("Error Fetch Attached Files:", error);
    return Array(ids.length).fill([]);
  }
}
