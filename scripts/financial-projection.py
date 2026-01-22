
def simulate_growth():
    principal = 10000.0
    monthly_interest_rate = 0.25  # 25% per month (Standard Payday)
    default_rate = 0.02          # 2% of Principal lost per month
    target_monthly_profit = 10000.0
    
    print(f"{'Month':<6} {'Start Balance':<15} {'Interest Gain':<15} {'Default Loss':<15} {'Net Profit':<15} {'End Balance':<15}")
    print("-" * 90)

    for month in range(1, 37): # Run for up to 3 years
        # Calculations
        # 1. Money lent to good borrowers (98%) generates interest
        gross_interest = (principal * (1 - default_rate)) * monthly_interest_rate
        
        # 2. Money lent to bad borrowers (2%) is lost principal
        principal_loss = principal * default_rate
        
        # 3. Net Profit
        net_profit = gross_interest - principal_loss
        
        # 4. New Principal (Reinvesting all profit)
        end_balance = principal + net_profit
        
        print(f"{month:<6} ${principal:,.2f}       ${gross_interest:,.2f}       ${principal_loss:,.2f}        ${net_profit:,.2f}       ${end_balance:,.2f}")
        
        if net_profit >= target_monthly_profit:
            print("-" * 90)
            print(f"🎉 GOAL REACHED in Month {month}: Net Profit ${net_profit:,.2f} exceeds target ${target_monthly_profit:,.2f}")
            break
            
        principal = end_balance

if __name__ == "__main__":
    simulate_growth()
