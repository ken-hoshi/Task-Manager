import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { DisplayWorkspaceIdProvider } from "./provider/displayWorkspaceIdProvider";
import { FlashDisplayProvider } from "./provider/flashDisplayProvider";
import { FormProvider } from "./provider/formProvider";
import { NotificationProvider } from "./provider/notificationProvider";
import { PageUpdateProvider } from "./provider/pageUpdateProvider";

// 書体はビルドのときに取り込み、アプリと一緒に配る。端末によって見え方が変わらないようにする（台帳 決定15）。
// 日本語の書体はファイルが多いので、先読み（preload）はしない
const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: false,
});

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
    <html lang="ja" className={notoSansJp.variable}>
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/img/favicon.ico" />
      </head>
      <body>
        <DisplayWorkspaceIdProvider>
          <FormProvider>
            <PageUpdateProvider>
              <FlashDisplayProvider>
                <NotificationProvider>{children}</NotificationProvider>
              </FlashDisplayProvider>
            </PageUpdateProvider>
          </FormProvider>
        </DisplayWorkspaceIdProvider>
      </body>
    </html>
  );
}
