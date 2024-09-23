import { Suspense } from "react";
import SuspenseComplete from "./suspenseComplete/suspenseComplete";

const Complete = () => {
  return (
    <Suspense>
      <SuspenseComplete />
    </Suspense>
  );
};

export default Complete;
