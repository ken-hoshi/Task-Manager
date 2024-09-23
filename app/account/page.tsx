import { Suspense } from "react";
import SuspenseAccount from "./suspenseAccount/suspenseAccount";

const Account: React.FC = () => {
  return (
    <Suspense>
      <SuspenseAccount />
    </Suspense>
  );
};

export default Account;
