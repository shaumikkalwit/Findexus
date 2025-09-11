import logging

# Set up a logger for this module
logger = logging.getLogger(__name__)

def _convert_statement_to_dict(stmt):
    if not stmt: return {}
    data = {}
    for item in stmt.iter_with_values():
        item_data = {
            'label': item.label,
            'concept': item.concept,
            'values': {},
            'is_total': getattr(item, 'is_total', False),
            'depth': getattr(item, 'depth', 0)
        }
        for period in stmt.periods:
            value = item.values.get(period)
            if value is not None:
                item_data['values'][period] = {'raw_value': value, 'display_value': item.get_display_value(period)}
        data[item.concept] = item_data
    return data

def _find_item_contains(statement, keyword):
    if not statement: return None
    for item in statement.iter_with_values():
        if keyword.lower() in item.label.lower():
            return item
    return None

def _calculate_financial_ratios(income_stmt, balance_sheet, cash_flow):
    ratios = {
        "Net Income": {}, "Retained Earnings": {}, "Gross Margin": {},
        "Net Margin": {}, "Return on Equity (ROE)": {}, "Years to Pay Off Debt": {},
        "Capex to Net Income": {}
    }
    if not income_stmt or not hasattr(income_stmt, 'periods'): return {}
    try:
        revenue_item = _find_item_contains(income_stmt, 'Revenue')
        gross_profit_item = _find_item_contains(income_stmt, 'Gross Profit')
        net_income_item = _find_item_contains(income_stmt, 'Net Income')
        equity_item = _find_item_contains(balance_sheet, 'Equity')
        retained_earnings_item = _find_item_contains(balance_sheet, 'Retained Earnings')
        capex_item = _find_item_contains(cash_flow, 'property, plant, and equipment')
        total_liabilities_item = _find_item_contains(balance_sheet, 'Liabilities')
        current_liabilities_item = _find_item_contains(balance_sheet, 'Liabilities, Current')
        noncurrent_liabilities_item = _find_item_contains(balance_sheet, 'Liabilities, Noncurrent')
        other_noncurrent_liabilities_item = _find_item_contains(balance_sheet, 'Other Liabilities, Noncurrent')

        for period in income_stmt.periods:
            revenue = revenue_item.values.get(period) if revenue_item else None
            gross_profit = gross_profit_item.values.get(period) if gross_profit_item else None
            net_income = net_income_item.values.get(period) if net_income_item else None
            total_equity = equity_item.values.get(period) if equity_item else None        
            retained_earnings = retained_earnings_item.values.get(period) if retained_earnings_item else None
            capex = capex_item.values.get(period) if capex_item else None
            
            long_term_debt = None
            if noncurrent_liabilities_item and other_noncurrent_liabilities_item:
                noncurrent_liabilities = noncurrent_liabilities_item.values.get(period)
                other_noncurrent_liabilities = other_noncurrent_liabilities_item.values.get(period)
                if noncurrent_liabilities is not None and other_noncurrent_liabilities is not None:
                    long_term_debt = noncurrent_liabilities - other_noncurrent_liabilities
            elif total_liabilities_item and current_liabilities_item:
                total_liabilities = total_liabilities_item.values.get(period)
                current_liabilities = current_liabilities_item.values.get(period)
                if total_liabilities is not None and current_liabilities is not None:
                    long_term_debt = total_liabilities - current_liabilities

            if net_income is not None: ratios["Net Income"][period] = net_income
            if retained_earnings is not None: ratios["Retained Earnings"][period] = retained_earnings
            if revenue and gross_profit and revenue != 0: ratios["Gross Margin"][period] = gross_profit / revenue
            if revenue and net_income and revenue != 0: ratios["Net Margin"][period] = net_income / revenue
            if net_income and total_equity and total_equity != 0: ratios["Return on Equity (ROE)"][period] = net_income / total_equity
            if net_income and net_income != 0: ratios["Years to Pay Off Debt"][period] = long_term_debt / net_income
            if net_income and capex and net_income != 0: ratios["Capex to Net Income"][period] = abs(capex) / net_income
    except Exception as e:
        logger.error(f"Error calculating ratios: {e}", exc_info=True)
    return {k: v for k, v in ratios.items() if v}