import logoLight from "@/assets/bharatlive-logo-light.png.asset.json";
import logoDark from "@/assets/bharatlive-logo-dark.png.asset.json";

type LogoProps = {
  className?: string;
};

export default function Logo({ className = "h-9 w-auto" }: LogoProps) {
  return (
    <>
      <img
        src={logoLight.url}
        alt="BharatLive"
        className={`${className} block dark:hidden`}
        width={163}
        height={52}
      />
      <img
        src={logoDark.url}
        alt="BharatLive"
        className={`${className} hidden dark:block`}
        width={163}
        height={52}
      />
    </>
  );
}
