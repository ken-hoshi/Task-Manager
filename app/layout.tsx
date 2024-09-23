import "./globals.css";
import { FlashDisplayProvider } from "./provider/flashDisplayProvider";
import { FormProvider } from "./provider/formProvider";
import { NotificationProvider } from "./provider/notificationProvider";
import { PageUpdateProvider } from "./provider/pageUpdateProvider";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://task-manager-eta-eosin.vercel.app";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Task Manager",
  description: "Task Manager for use by a limited number of employees.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/img/favicon.ico" />
        <link
          href="https://fonts.googleapis.com/css2?family=Advent+Pro:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body>
        <FormProvider>
          <PageUpdateProvider>
            <FlashDisplayProvider>
              <NotificationProvider>{children}</NotificationProvider>
            </FlashDisplayProvider>
          </PageUpdateProvider>
        </FormProvider>
      </body>
    </html>
  );
}
