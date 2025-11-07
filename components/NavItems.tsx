"use client";
import { NAV_ITEMS } from "@/lib/constants";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchCommand from "./SearchCommand";

const NavItems = ({
  initialStocks,
}: {
  initialStocks: StockWithWatchlistStatus[];
}) => {
  const pathname = usePathname();
  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";

    return pathname.startsWith(path);
  };
  return (
    <ul className="flex flex-col sm:flex-row p-2 gap-3 sm:gap-10 font-medium">
      {NAV_ITEMS.map(({ label, href }) => {
        if (href === "/search") {
          return (
            <li key={href}>
              <SearchCommand
                renderAs="text"
                label="Хайх"
                initialStocks={initialStocks}
              />
            </li>
          );
        }
        return (
          <li key={href}>
            <Link
              className={`hover:text-yellow-500 transition-colors ${
                isActive(href) ? "text-gray-100" : ""
              }`}
              href={href}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default NavItems;
