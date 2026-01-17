"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCookie, setCookie } from "cookies-next";

const AGE_VERIFIED_COOKIE = "age_verified";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export function AgeVerificationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    // Check if user has already verified age
    const ageVerified = getCookie(AGE_VERIFIED_COOKIE);
    if (!ageVerified) {
      setIsOpen(true);
    }
  }, []);

  const handleVerify = () => {
    if (rememberMe) {
      setCookie(AGE_VERIFIED_COOKIE, "true", { maxAge: COOKIE_MAX_AGE });
    } else {
      // Session cookie (no maxAge)
      setCookie(AGE_VERIFIED_COOKIE, "true");
    }
    setIsOpen(false);
  };

  const handleDeny = () => {
    // Redirect to a safe page or show message
    window.location.href = "https://www.google.com";
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md border-border/50"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mx-auto h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"
          >
            <Leaf className="h-8 w-8 text-primary" />
          </motion.div>
          <DialogTitle className="text-2xl font-semibold">
            Age Verification Required
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            You must be 21 years or older to enter this site. Please verify your
            age to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200">
              By entering this site, you confirm that you are at least 21 years
              of age and agree to our Terms of Service.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <Label
              htmlFor="remember"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Remember me for 24 hours
            </Label>
          </div>

          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={handleVerify}>
              I am 21 or older - Enter
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDeny}
            >
              I am under 21 - Exit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
