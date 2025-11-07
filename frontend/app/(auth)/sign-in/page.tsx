"use client";

import { SubmitHandler, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import FooterLink from "@/components/forms/FooterLink";
// import { signInWithEmail, signUpWithEmail } from "@/lib/actions/auth.actions";
import { toast } from "sonner";
// import { signInEmail } from "better-auth/api";
import { useRouter } from "next/navigation";
import { signInWithEmail, signUpWithEmail } from "@/lib/actions/auth.actions";

const SignIn = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit: SubmitHandler<SignInFormData> = async (
    data: SignInFormData
  ) => {
    try {
      console.log(data);
      const result = await signInWithEmail(data);
      if (result.success) {
        toast.success("Тавтай морилно уу");
        router.push("/");
      } else {
        toast.error("Нэвтрэлт амжилтгүй", {
          description: result.error || "Нэвтрэхэд алдаа гарлаа",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Нэвтрэлт амжилтгүй", {
        description:
          error instanceof Error ? error.message : "Нэвтрэхэд алдаа гарлаа",
      });
    }
  };

  return (
    <>
      <h1 className="form-title">Тавтай морилно уу</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <InputField
          name="email"
          label="И-мэйл"
          placeholder="bold@gmail.com"
          register={register}
          error={errors.email}
          validation={{
            required: "И-мэйл заавал оруулна уу",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "И-мэйл буруу байна",
            },
          }}
        />

        <InputField
          name="password"
          label="Нууц үг"
          placeholder="Нууц үг оруулна уу"
          type="password"
          register={register}
          error={errors.password}
          validation={{
            required: "Нууц үг заавал оруулна уу",
            minLength: {
              value: 8,
              message: "Нууц үг хамгийн багадаа 8 оронтой байх ёстой",
            },
          }}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="yellow-btn w-full mt-5"
        >
          {isSubmitting ? "Нэвтэрч байна.." : "Нэвтрэх"}
        </Button>

        <FooterLink
          text="Хаяг байхгүй юу?"
          linkText="Бүртгүүлэх"
          href="/sign-up"
        />
      </form>
    </>
  );
};
export default SignIn;
