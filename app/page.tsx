import { HomePage } from "@/components/home-page";
import { getCatalog } from "@/lib/telegraph/discover";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page() {
  const catalog = await getCatalog();
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <HomePage catalog={catalog} />
    </>
  );
}
