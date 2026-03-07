-- 全服骰子事件 RPC：所有玩家 EnergyDice +N
CREATE OR REPLACE FUNCTION global_dice_bonus(p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE "CharacterStats"
    SET "EnergyDice" = COALESCE("EnergyDice", 0) + p_amount;
END;
$$;
