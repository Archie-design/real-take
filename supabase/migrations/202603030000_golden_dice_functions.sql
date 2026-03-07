-- Create functions for Golden Dice features

-- 1. Transfer Golden Dice to Captain
CREATE OR REPLACE FUNCTION transfer_golden_dice(donor_id TEXT, captain_id TEXT, amount INT)
RETURNS void AS $$
BEGIN
    UPDATE "CharacterStats"
    SET "GoldenDice" = "GoldenDice" - amount
    WHERE "UserID" = donor_id AND "GoldenDice" >= amount;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient Golden Dice';
    END IF;

    UPDATE "CharacterStats"
    SET "GoldenDice" = "GoldenDice" + amount
    WHERE "UserID" = captain_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Refill Energy Dice using Golden Dice
CREATE OR REPLACE FUNCTION refill_energy_dice(user_id TEXT)
RETURNS void AS $$
DECLARE
    cap_val INT;
BEGIN
    -- Get Max Energy (Cap)
    SELECT "Value"::INT INTO cap_val FROM "SystemSettings" WHERE "SettingName" = 'EnergyDiceCap';
    
    -- Deduct 1 Golden Dice
    UPDATE "CharacterStats"
    SET "GoldenDice" = "GoldenDice" - 1
    WHERE "UserID" = user_id AND "GoldenDice" >= 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient Golden Dice';
    END IF;

    -- Refill Energy Dice to Cap
    UPDATE "CharacterStats"
    SET "EnergyDice" = cap_val
    WHERE "UserID" = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
