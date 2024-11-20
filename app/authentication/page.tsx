import { Suspense } from "react";
import SuspenseAuthentication from "./suspenseAuthentication/suspenseAuthentication";

const Authentication = () => {
  return (
    <Suspense>
      <SuspenseAuthentication />
    </Suspense>
  );
};

export default Authentication;
