import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "그림이야기 | DrawTale",
  description: "아이의 그림일기를 한국어와 영어의 짧은 이야기로 확장하는 AI 창작 서비스"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
