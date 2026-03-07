-- Combat Rewards and Dice Transfer Functions

-- Function: add_combat_rewards
-- Purpose: Atomically update HP, Exp, Coins, and Dice for combat victory
CREATE OR REPLACE FUNCTION public.add_combat_rewards(
    p_user_id TEXT,
    p_exp INTEGER,
    p_coins INTEGER,
    p_dice INTEGER,
    p_golden_dice INTEGER,
    p_new_hp INTEGER
) RETURNS VOID AS $$
BEGIN
    UPDATE public."CharacterStats"
    SET 
        "Exp" = "Exp" + p_exp,
        "Coins" = "Coins" + p_coins,
        "EnergyDice" = "EnergyDice" + p_dice,
        "GoldenDice" = "GoldenDice" + p_golden_dice,
        "HP" = p_new_hp
    WHERE "UserID" = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: transfer_dice
-- Purpose: Atomically transfer EnergyDice between two users
CREATE OR REPLACE FUNCTION public.transfer_dice(
    p_from_user TEXT,
    p_to_user TEXT,
    p_amount INTEGER
) RETURNS VOID AS $$
BEGIN
    -- Check if sender has enough dice
    IF (SELECT "EnergyDice" FROM public."CharacterStats" WHERE "UserID" = p_from_user) < p_amount THEN
        RAISE EXCEPTION '能源骰子不足';
    END IF;

    -- Subtract from donor
    UPDATE public."CharacterStats"
    SET "EnergyDice" = "EnergyDice" - p_amount
    WHERE "UserID" = p_from_user;

    -- Add to recipient
    UPDATE public."CharacterStats"
    SET "EnergyDice" = "EnergyDice" + p_amount
    WHERE "UserID" = p_to_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add GoldenDice column to CharacterStats if not exists
ALTER TABLE public."CharacterStats" ADD COLUMN IF NOT EXISTS "GoldenDice" INTEGER DEFAULT 0;

-- Helper to increment values in JSONB or table columns 
-- Supabase has some built-in rpc helpers but defining custom one for clarity if needed
CREATE OR REPLACE FUNCTION public.increment(x INTEGER) RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(x, 0) + 1;
END;
$$ LANGUAGE plpgsql;
