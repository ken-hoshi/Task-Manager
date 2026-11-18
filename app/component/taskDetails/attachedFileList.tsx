import classNames from "classnames";
import { AttachedFileData, CssModule } from "./types";

interface AttachedFileListProps {
  fileDataArray: AttachedFileData[] | undefined;
  styles: CssModule;
}

// 詳細の行の「Attached File」欄。ファイル名でダウンロードできるリンクの一覧
const AttachedFileList: React.FC<AttachedFileListProps> = ({
  fileDataArray,
  styles,
}) => {
  if (!fileDataArray || fileDataArray.length === 0) {
    return <>No Attached File</>;
  }

  return (
    <>
      {fileDataArray.map((fileData, index) => (
        <div className={styles["display-attachedFile-container"]} key={index}>
          <div className={styles["file-info"]}>
            <a href={fileData.url || "#"} download={fileData.file.name}>
              <span
                className={classNames(
                  "material-symbols-outlined",
                  styles.downloadIcon
                )}
              >
                download
              </span>
            </a>
          </div>
          <p>{fileData.file.name}</p>
        </div>
      ))}
    </>
  );
};

export default AttachedFileList;
