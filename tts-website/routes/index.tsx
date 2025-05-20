import { useSignal } from "@preact/signals";
import Counter from "../islands/Counter.tsx";

export default function Home() {
  const count = useSignal(3);
  return (
    <div class="px-4 py-8 mx-auto bg-[#86eaef]">
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">

        <h1 class="text-4xl font-bold">Text to Audio</h1>
        <p class="my-4">
          <a href="/login">Login</a>
        </p>
        <Counter count={count} />
      </div>
    </div>
  );
}
