import { Suspense } from "react";
import SuspenseProject from "./suspenseProject/suspenseProject";

const Project = () => {
  return (
    <Suspense>
      <SuspenseProject />
    </Suspense>
  );
};

export default Project;
