import { Suspense } from "react";
import SuspenseCreateWorkspace from "./suspenseWorkspace/suspenseCreateWorkspace";

const CreateWorkspace = () => {
  return (
    <Suspense>
      <SuspenseCreateWorkspace />
    </Suspense>
  );
};

export default CreateWorkspace;
