import { Suspense } from "react";
import SuspenseCreateWorkspace from "./suspenseCreateWorkspace/suspenseCreateWorkspace";

const CreateWorkspace = () => {
  return (
    <Suspense>
      <SuspenseCreateWorkspace />
    </Suspense>
  );
};

export default CreateWorkspace;
