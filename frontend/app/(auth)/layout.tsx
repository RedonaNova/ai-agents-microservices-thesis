import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  // If user already has our JWT cookie, redirect to home
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (token) redirect("/");

  return (
    <main className="auth-layout">
      <section className="auth-left-section scrollbar-hide-default">
        <Link href="/" className="auth-logo">
          <Image
            src="/assets/icons/logo.svg"
            alt="logo"
            width={140}
            height={32}
            className="h-8 w-auto cursor-pointer"
          />
        </Link>
        <div className="pb-6 lg:pb-8 flex-1">{children}</div>
      </section>
      <section className="auth-right-section">
        <div className="z-10 relative lg:mt-4 lg:mb-16">
          <blockquote className="auth-blockquote">
            Дипломын ажлын хэрэгжүүлэлт: Микросервист суурилсан хиймэл оюун
            агентууд. Демо: Монгол, Гадаад хувьцааны хөрөнгийн зах зээлийн
            мэдээг хиймэл оюунаар шинжлэн дүрслэх.
          </blockquote>
          <div className="flex items-center justify-between">
            <div>
              <cite className="auth-testimonial-author">
                Булганы Раднаабазар
              </cite>
              <p className="max-md:text-xs text-gray-500">
                МУИС, МТЭС, МКУТ, Мэдээллийн технологи
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((start) => (
                <Image
                  key={start}
                  src="/assets/icons/star.svg"
                  alt="star"
                  width={20}
                  height={20}
                  className="size-5 "
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 relative">
          <Image
            src="/assets/images/dashboard-preview.png"
            alt="dashboard preview"
            width={1440}
            height={1150}
            className="auth-dashboard-preview absolute top-0"
          />
        </div>
      </section>
    </main>
  );
};

export default Layout;
