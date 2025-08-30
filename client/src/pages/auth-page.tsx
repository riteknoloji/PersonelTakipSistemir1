import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Users, Building, Clock, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const loginSchema = z.object({
  phone: z.string().min(10, "Telefon numarası en az 10 karakter olmalıdır"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof insertUserSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation, verify2FAMutation } = useAuth();
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string>("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  // Fetch branches for registration
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
    enabled: false, // Only fetch when needed
  });

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      phone: "",
      password: "",
      name: "",
      role: "branch_admin",
      branchId: "",
      isActive: true,
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = (data: LoginForm) => {
    loginMutation.mutate(data, {
      onSuccess: (response) => {
        if (response.requiresTwoFactor) {
          setShowTwoFactor(true);
          setPendingUserId(response.userId);
        }
      },
    });
  };

  const handleRegister = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  const handleTwoFactorSubmit = () => {
    if (twoFactorCode.length === 6) {
      verify2FAMutation.mutate({
        userId: pendingUserId,
        code: twoFactorCode,
      });
    }
  };

  if (showTwoFactor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Doğrulama Kodu</CardTitle>
            <CardDescription>
              Telefon numaranıza gönderilen 6 haneli kodu girin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={twoFactorCode}
                onChange={setTwoFactorCode}
                data-testid="input-2fa-code"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button 
              onClick={handleTwoFactorSubmit}
              className="w-full"
              disabled={twoFactorCode.length !== 6 || verify2FAMutation.isPending}
              data-testid="button-verify-2fa"
            >
              {verify2FAMutation.isPending ? "Doğrulanıyor..." : "Doğrula"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowTwoFactor(false);
                setTwoFactorCode("");
                setPendingUserId("");
              }}
              className="w-full"
              data-testid="button-back-to-login"
            >
              Geri Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Forms */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">PTS</h1>
            </div>
            <h2 className="text-xl text-muted-foreground">Personel Takip Sistemi</h2>
          </div>

          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Giriş Yap</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Kayıt Ol</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Giriş Yap</CardTitle>
                  <CardDescription>
                    Telefon numaranız ve şifrenizle giriş yapın
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon Numarası</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="05xxxxxxxxx"
                                {...field}
                                data-testid="input-login-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Şifre</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Şifrenizi girin"
                                {...field}
                                data-testid="input-login-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                        data-testid="button-login-submit"
                      >
                        {loginMutation.isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Kayıt Ol</CardTitle>
                  <CardDescription>
                    Yeni hesap oluşturun
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ad Soyad</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ad Soyad"
                                {...field}
                                data-testid="input-register-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon Numarası</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="05xxxxxxxxx"
                                {...field}
                                data-testid="input-register-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Şifre</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Şifrenizi girin"
                                {...field}
                                data-testid="input-register-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rol</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-register-role">
                                  <SelectValue placeholder="Rol seçin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="super_admin">Süper Admin</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="branch_admin">Şube Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                        data-testid="button-register-submit"
                      >
                        {registerMutation.isPending ? "Kayıt yapılıyor..." : "Kayıt Ol"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex lg:items-center lg:justify-center bg-primary text-primary-foreground p-8">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-4xl font-bold">Personel Yönetimi</h1>
          <p className="text-lg text-primary-foreground/80">
            Kapsamlı personel takip ve yönetim sistemi ile işletmenizi daha verimli hale getirin.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="text-center p-4">
              <Building className="w-8 h-8 mx-auto mb-2" />
              <h3 className="font-medium">Şube Yönetimi</h3>
              <p className="text-sm text-primary-foreground/70">Çoklu şube desteği</p>
            </div>
            <div className="text-center p-4">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <h3 className="font-medium">Vardiya Takibi</h3>
              <p className="text-sm text-primary-foreground/70">Otomatik vardiya yönetimi</p>
            </div>
            <div className="text-center p-4">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <h3 className="font-medium">Personel Takibi</h3>
              <p className="text-sm text-primary-foreground/70">Kapsamlı personel bilgileri</p>
            </div>
            <div className="text-center p-4">
              <Shield className="w-8 h-8 mx-auto mb-2" />
              <h3 className="font-medium">Güvenli Giriş</h3>
              <p className="text-sm text-primary-foreground/70">2FA ile güvenli erişim</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
