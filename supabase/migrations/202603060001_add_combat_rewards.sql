-- 戰鬥獎勵 RPC：一次性更新 Exp、Coins、EnergyDice、GoldenDice、HP
CREATE OR REPLACE FUNCTION add_combat_rewards(
    p_user_id   text,
    p_exp       integer,
    p_coins     integer,
    p_dice      integer,
    p_golden_dice integer,
    p_new_hp    integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE "CharacterStats"
    SET
        "Exp"         = COALESCE("Exp", 0)         + p_exp,
        "Coins"       = COALESCE("Coins", 0)       + p_coins,
        "EnergyDice"  = COALESCE("EnergyDice", 0)  + p_dice,
        "GoldenDice"  = COALESCE("GoldenDice", 0)  + p_golden_dice,
        "HP"         = p_new_hp
    WHERE "UserID" = p_user_id;
END;
$$;
