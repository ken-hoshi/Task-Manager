import { clientSupabase } from "./supabase/client";

enum Target {
  project,
  task,
}

export async function fetchAttachmentFiles(target: number, id: number) {
  try {
    const attachmentFilesData: File[] = [];

    if (target == Target.project) {
      const { data: projectAttachments, error: selectProjectAttachmentsError } =
        await clientSupabase
          .from("project_attachments")
          .select("*")
          .eq("project_id", id);

      if (selectProjectAttachmentsError) {
        throw selectProjectAttachmentsError;
      }
      if (!projectAttachments || projectAttachments.length === 0) {
        return [];
      }

      for (const attached of projectAttachments) {
        const {
          data: projectAttachmentFileStorage,
          error: projectAttachmentFileStorageError,
        } = await clientSupabase.storage
          .from("project_attachments")
          .download(attached.file_path);

        if (projectAttachmentFileStorageError) {
          throw projectAttachmentFileStorageError;
        }

        if (projectAttachmentFileStorage) {
          const fileName = attached.file_path || "unknown";
          const file = new File([projectAttachmentFileStorage], fileName, {
            type: projectAttachmentFileStorage.type,
          });
          attachmentFilesData.push(file);
        }
      }
    } else if (target == Target.task) {
      const { data: taskAttachments, error: selectTaskAttachmentsError } =
        await clientSupabase
          .from("task_attachments")
          .select("*")
          .eq("task_id", id);

      if (selectTaskAttachmentsError) {
        throw selectTaskAttachmentsError;
      }
      if (!taskAttachments || taskAttachments.length === 0) {
        return [];
      }
      for (const attached of taskAttachments) {
        const {
          data: taskAttachmentFileStorage,
          error: taskAttachmentFileStorageError,
        } = await clientSupabase.storage
          .from("task_attachments")
          .download(attached.file_path);

        if (taskAttachmentFileStorageError) {
          throw taskAttachmentFileStorageError;
        }

        if (taskAttachmentFileStorage) {
          const fileName = attached.file_path || "unknown";
          const file = new File([taskAttachmentFileStorage], fileName, {
            type: taskAttachmentFileStorage.type,
          });
          attachmentFilesData.push(file);
        }
      }
    } else {
      throw new Error("Task ID & Project ID are Null.");
    }
    return attachmentFilesData;
  } catch (error) {
    console.error("Error fetch attached files:", error);
    return [];
  }
}
