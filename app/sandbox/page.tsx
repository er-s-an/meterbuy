import { Desk } from "@/components/desk";

export const dynamic = "force-dynamic";

export default async function SandboxPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; symbol?: string; mode?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <a className="skip" href="#desk">
        Skip to the desk
      </a>
      <header className="bar-page">
        <a className="word" href="/">
          MeterBuy
        </a>
        <a href="/#jobs">Jobs</a>
      </header>
      <Desk
        initialPreset={params.preset || "briefing"}
        initialSymbol={params.symbol || ""}
        initialMode={params.mode || ""}
      />
    </>
  );
}
