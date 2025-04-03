import { Suspense } from "react";
import SuspenseJoinWorkspace from "./suspenseJoinWorkspace/suspenseJoinWorkspace";

const JoinWorkspace = () => {
  return (
    <Suspense>
      <SuspenseJoinWorkspace />
    </Suspense>
  );
};

export default JoinWorkspace;
