"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, AlertCircle, FileText, CheckCircle2, AlertTriangle } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

interface FastTrackWizardProps {
    previousData: any;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

export function FastTrackWizard({ previousData, onSubmit, onCancel }: FastTrackWizardProps) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [loanAmount, setLoanAmount] = useState(previousData.loanAmount || 3000);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [payslip, setPayslip] = useState("");

    // Read details from history
    const employer = previousData.employerName || "Unknown Employer";
    const account = previousData.accountNumber ? `****${String(previousData.accountNumber).slice(-4)}` : "Unknown Account";
    const bank = previousData.bankName || "Unknown Bank";

    // Simplified Financials (Assume payday loan for fast-track)
    const INTEREST_RATE = 0.25;
    const repaymentTotal = loanAmount + (loanAmount * INTEREST_RATE);

    const handleMockUpload = async () => {
        setIsLoading(true);
        // Simulate S3 upload
        await new Promise(res => setTimeout(res, 1500));
        setPayslip("https://example.com/payslip_nov_24.pdf");
        setIsLoading(false);
        setStep(3);
    };

    const handleFinalSubmit = async () => {
        if (!termsAccepted) {
            toast.error("You must accept the terms to proceed.");
            return;
        }
        setIsLoading(true);

        // Construct the merged fast-track payload
        const fastTrackPayload = {
            ...previousData,
            loanAmount: Number(loanAmount),
            recentPayslip: payslip,
            termsAccepted: termsAccepted,
            isFastTrack: true // Flag for the backend
        };

        await onSubmit(fastTrackPayload);
        setIsLoading(false);
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <span className="text-omari text-3xl">⚡</span>
                            1-Click Express Application
                        </CardTitle>
                        <CardDescription>
                            Welcome back! Apply in seconds using your verified profile.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-muted p-4 rounded-lg flex items-start gap-4 border border-border">
                            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-foreground">Verified Details</h4>
                                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                                    <li><span className="font-medium text-foreground">Employer:</span> {employer}</li>
                                    <li><span className="font-medium text-foreground">Bank:</span> {bank} ({account})</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg flex gap-3 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p className="text-sm">
                                If you no longer work at {employer}, or wish to use a different bank account, you must complete the standard application.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between gap-4">
                        <Button variant="outline" onClick={onCancel}>Update My Details</Button>
                        <Button onClick={() => setStep(2)}>Yes, Details Are Correct</Button>
                    </CardFooter>
                </Card>
            )}

            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Verify Current Employment</CardTitle>
                        <CardDescription>As per NAMFISA regulations, please provide your latest payslip.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-4 group">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8" />
                            </div>
                            <div className="text-center">
                                <p className="font-medium">Upload Latest Payslip</p>
                                <p className="text-sm text-muted-foreground mt-1">Must be from the last 30 days (PDF, JPG, PNG)</p>
                            </div>
                            <Button
                                variant={payslip ? "secondary" : "default"}
                                onClick={handleMockUpload}
                                disabled={isLoading || !!payslip}
                            >
                                {isLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                                {payslip ? "Uploaded" : "Select File"}
                            </Button>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                        <Button onClick={() => setStep(3)} disabled={!payslip}>Continue</Button>
                    </CardFooter>
                </Card>
            )}

            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Loan & Finalize</CardTitle>
                        <CardDescription>Instantly select your payday loan amount.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Loan Amount (N$)</Label>
                            <Input
                                type="number"
                                value={loanAmount}
                                onChange={(e) => setLoanAmount(Number(e.target.value))}
                                min={500}
                                max={10000}
                                step={100}
                            />
                        </div>

                        <div className="bg-muted p-4 rounded-lg space-y-2 text-sm border border-border">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Principal:</span>
                                <span>{formatCurrency(loanAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Interest (25% Flat):</span>
                                <span>{formatCurrency(loanAmount * INTEREST_RATE)}</span>
                            </div>
                            <div className="w-full h-px bg-border my-2" />
                            <div className="flex justify-between font-bold text-foreground">
                                <span>Total to Repay:</span>
                                <span>{formatCurrency(repaymentTotal)}</span>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3 pt-4 border-t border-border">
                            <Switch
                                id="terms"
                                checked={termsAccepted}
                                onCheckedChange={setTermsAccepted}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="terms"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    I accept the Loan Agreements and Terms
                                </label>
                                <p className="text-sm text-muted-foreground">
                                    By accepting, you agree to an auto-debit collection of {formatCurrency(repaymentTotal)} on your next salary date.
                                </p>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                        <Button size="lg" onClick={handleFinalSubmit} disabled={!termsAccepted || isLoading} className="gap-2">
                            {isLoading ? <Spinner className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            Sign & Submit
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    )
}
