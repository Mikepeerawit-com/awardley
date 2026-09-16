import { HomeContent } from "@/components/home";

/**
 * The page is the route and nothing else. Everything it draws lives in `HomeContent`,
 * which is sync and therefore reachable from the 390px layout suite — see the note there.
 */
export default function HomePage() {
  return <HomeContent />;
}
