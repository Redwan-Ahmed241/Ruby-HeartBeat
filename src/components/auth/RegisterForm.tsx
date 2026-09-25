import { useState } from "react";
import { AlertCircle, Eye, EyeOff, ShieldCheck, User, HeartHandshake } from "lucide-react";
import { useRegister } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole, BloodGroup } from "@/lib/api/types";
import { calculateAge } from "@/lib/dateUtils";
import { toast } from "sonner";

interface RegisterFormProps {
  onSuccess?: () => void;
  defaultRole?: UserRole;
}

export function RegisterForm({ onSuccess, defaultRole = "DONOR" }: RegisterFormProps) {
  const registerMutation = useRegister();

  const [role, setRole] = useState<UserRole>(defaultRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+8801700000000");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<BloodGroup>("O_POSITIVE");
  const [address, setAddress] = useState("Banani, Dhaka");
  const [nidOrBirthCert, setNidOrBirthCert] = useState("");

  const calculatedAge = calculateAge(dateOfBirth);
  const isDonor = role === "DONOR";
  const isUnderage = isDonor && calculatedAge !== null && calculatedAge < 18;
  const isOverage = isDonor && calculatedAge !== null && calculatedAge > 65;
  const isAgeValid = !isDonor 
    ? (calculatedAge !== null && calculatedAge >= 1) 
    : (calculatedAge !== null && calculatedAge >= 18 && calculatedAge <= 65);

  const isSubmitDisabled = registerMutation.isPending || !dateOfBirth || (isDonor && !isAgeValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateOfBirth) {
      toast.error("Date of birth is required.");
      return;
    }

    if (calculatedAge === null || calculatedAge < 1) {
      toast.error("Please provide a valid date of birth.");
      return;
    }

    if (isDonor) {
      if (calculatedAge < 18) {
        toast.error(`You must be at least 18 years old to register as a blood donor (Selected age: ${calculatedAge} years old).`);
        return;
      }
      if (calculatedAge > 65) {
        toast.error(`Maximum eligible age for regular blood donation is 65 years (Selected age: ${calculatedAge} years old).`);
        return;
      }
    }

    try {
      await registerMutation.mutateAsync({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
        date_of_birth: dateOfBirth,
        age: calculatedAge ?? undefined,
        blood_group: selectedBloodGroup || "O_POSITIVE",
        address: address.trim() || "Dhaka, Bangladesh",
        gender: "Other",
        weight: 68.0,
        latitude: 23.7937,
        longitude: 90.4066,
        nid_or_birth_cert: nidOrBirthCert.trim() || undefined,
      });

      toast.success("Account registered successfully! Please sign in with your credentials.");
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      // Error handled by mutation toast
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {/* Role Selection */}
      <div className="space-y-1.5">
        <Label htmlFor="reg-role" className="text-xs font-semibold">
          Account Type / Role *
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole("DONOR")}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              role === "DONOR"
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border/80 bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            <HeartHandshake className="size-4 text-primary" />
            <span>Blood Donor</span>
          </button>
          <button
            type="button"
            onClick={() => setRole("RECIPIENT")}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              role === "RECIPIENT"
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border/80 bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="size-4 text-primary" />
            <span>Recipient Only</span>
          </button>
        </div>
      </div>

      {/* Full Name */}
      <div className="space-y-1">
        <Label htmlFor="reg-name" className="text-xs font-semibold">
          Full Name *
        </Label>
        <Input
          id="reg-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Dr. Ayesha Rahman"
          required
          className="text-xs h-9"
        />
      </div>

      {/* Email & Phone */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="reg-email" className="text-xs font-semibold">
            Email Address *
          </Label>
          <Input
            id="reg-email"
            type="email"
            placeholder="ayesha@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="text-xs h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="reg-phone" className="text-xs font-semibold">
            Phone Number *
          </Label>
          <Input
            id="reg-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+8801700000000"
            required
            className="text-xs h-9"
          />
        </div>
      </div>

      {/* Password & Blood Group */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="reg-pass" className="text-xs font-semibold">
            Password *
          </Label>
          <div className="relative">
            <Input
              id="reg-pass"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-9 text-xs h-9"
              required
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="reg-blood-group" className="text-xs font-semibold">
            Blood Group *
          </Label>
          <Select
            value={selectedBloodGroup}
            onValueChange={(v) => setSelectedBloodGroup(v as BloodGroup)}
          >
            <SelectTrigger id="reg-blood-group" className="text-xs h-9">
              <SelectValue placeholder="Blood group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="O_POSITIVE">O+ (O Positive)</SelectItem>
              <SelectItem value="O_NEGATIVE">O- (O Negative)</SelectItem>
              <SelectItem value="A_POSITIVE">A+ (A Positive)</SelectItem>
              <SelectItem value="A_NEGATIVE">A- (A Negative)</SelectItem>
              <SelectItem value="B_POSITIVE">B+ (B Positive)</SelectItem>
              <SelectItem value="B_NEGATIVE">B- (B Negative)</SelectItem>
              <SelectItem value="AB_POSITIVE">AB+ (AB Positive)</SelectItem>
              <SelectItem value="AB_NEGATIVE">AB- (AB Negative)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mandatory Date of Birth Field */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="reg-dob" className="text-xs font-semibold flex items-center gap-1">
            <span>Date of Birth</span>
            <span className="text-destructive">*</span>
          </Label>
          <span className="text-[10px] text-muted-foreground">
            {isDonor ? "Donors must be 18 to 65 years old." : "Strictly required"}
          </span>
        </div>
        <Input
          id="reg-dob"
          name="date_of_birth"
          type="date"
          required
          max={new Date().toISOString().split("T")[0]}
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className={`text-xs h-9 ${
            isUnderage || isOverage
              ? "border-destructive focus-visible:ring-destructive"
              : ""
          }`}
        />

        {/* Real-time Dynamic Age Feedback */}
        {calculatedAge !== null && (
          <div className="mt-1">
            {isUnderage && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive p-2 rounded-md bg-destructive/10 border border-destructive/20 animate-in fade-in duration-200">
                <AlertCircle className="size-4 shrink-0" />
                <span>⚠️ You must be at least 18 years old to register as a blood donor (Selected age: {calculatedAge} years old)</span>
              </div>
            )}

            {isOverage && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive p-2 rounded-md bg-destructive/10 border border-destructive/20 animate-in fade-in duration-200">
                <AlertCircle className="size-4 shrink-0" />
                <span>⚠️ Maximum eligible age for regular blood donation is 65 years (Selected age: {calculatedAge} years old)</span>
              </div>
            )}

            {((isDonor && !isUnderage && !isOverage) || (!isDonor && calculatedAge >= 1)) && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="size-3.5" />
                <span>✓ Age: {calculatedAge} years old {isDonor ? "(Eligible for donation)" : "(Valid)"}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Area / City */}
      <div className="space-y-1">
        <Label htmlFor="reg-address" className="text-xs font-semibold">
          Area / City (Dhaka) *
        </Label>
        <Input
          id="reg-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. Banani, Dhaka or Dhanmondi, Dhaka"
          required
          className="text-xs h-9"
        />
      </div>

      {/* National ID / Birth Cert */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="reg-nid" className="text-xs font-semibold">
            National ID (NID) or Birth Certificate
          </Label>
          <span className="text-[10px] text-muted-foreground">
            (Optional - Speeds up verification)
          </span>
        </div>
        <Input
          id="reg-nid"
          value={nidOrBirthCert}
          onChange={(e) => setNidOrBirthCert(e.target.value)}
          placeholder="e.g. 19982692... or NID number"
          className="text-xs h-9"
        />
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
        {isDonor
          ? "Blood Donor: You will be matched with emergency requests in your area when your health and cooldown criteria are satisfied."
          : "Recipient: You can initiate emergency blood requests and connect directly with verified volunteer donors."}
      </p>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full mt-2 font-bold text-xs"
        disabled={isSubmitDisabled}
      >
        {registerMutation.isPending
          ? "Creating Account..."
          : !dateOfBirth
          ? "Select Date of Birth"
          : isUnderage
          ? "Cannot Register Under 18"
          : isOverage
          ? "Exceeds Eligible Age (65)"
          : "Create Account"}
      </Button>
    </form>
  );
}
