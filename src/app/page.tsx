import { FocusBoardApp } from "@/components/focusboard/focusboard-app";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Home() {
  return <FocusBoardApp />;
}
