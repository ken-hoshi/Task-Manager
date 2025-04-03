import { Suspense } from "react";
import SuspenseEditWorkspace from "./suspenseEditWorkspace/suspenseEditWorkspace";

const EditWorkspace = () => {
  return (
    <Suspense>
      <SuspenseEditWorkspace />
    </Suspense>
  );
};

export default EditWorkspace;
