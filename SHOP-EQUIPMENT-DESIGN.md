# 商店、装备与队友招募

日期：2026-09-20。本说明记录本轮实施契约，不表示已发布。

装备数据与战斗模块已在 `src/coop/equipment-data.js`、`src/coop/equipment.js` 实现，25 项装备组件自动化通过。`equipment-effects.js` 使用现有 PNG 绘制独立的装备弹道与地面效果。商店购买、招募换人、实战渲染和浏览器流程由 World 与界面模块统一接入；组件通过不能代替这些流程的实际验收。

## 商店与金币

- 每 5 关的休整点提供 3 件队伍共享商品和 1 名招募候选。购买后即移除，不能让两名玩家重复购买同一库存。
- 金币沿用目前的低概率掉落，必须拾取后才记入队伍余额。装备不新增自动入账、保底金币或免费刷新。
- 武器、防具价格分别采用同一稀有度梯度：普通 24、精良 43、稀有 72、传奇 112 金币。第 6 关起，每 5 关档乘数增加 0.26。本轮没有出售或仓库入口，购买替换后旧装销毁。
- 商品是职业专属，购买目标必须存在且职业吻合。价格扣款、库存移除与装配成功应作为一次交易；失败不扣钱、不移货。队伍共享余额不等于职业共享装备。
- 招募费由候选模块结算，并考虑候选天赋与携带装备；招募装备绑定角色，本轮不能拆卖或转移给其他角色。

### 价格依据

使用 `pressurePlan` 未按人数缩放的三人每波总预算，配合 `pressureKind`、`rareRoll`、`lootRoll`，模拟种子 1～1000。假设全数击杀且全部金币拾取；第 10 关按 Boss 的 10 金币计入。这是掉落预算，不是自然通关收入或真人拾取率。最新人数压力、单人低频金币数值 ×2 与实际首店购买率以 [商店前队伍平衡验证](SHOP-PARTY-BALANCE.md) 为准。

| 累计清关 | 掉金币 P10 | 中位 | P90 | 按 60% 拾取作价格敏感性折扣后的中位 |
|---|---:|---:|---:|---:|
| 5 | 61 | 80 | 101 | 48 |
| 10 | 193 | 226 | 263 | 136 |
| 15 | 419 | 472 | 527 | 283 |

首店约 48 金币的参考预算意味着可以买一件普通或精良装备，也可留钱招募；无法同时扫空三件库存。后续收入表是累计值，没有减去先前消费。慢速队伍可能在持续时间到期前未耗尽刷怪预算，实际金币会更少，因此不能将此表当成商店必买保证。

## 装备槽与外形

每名角色有独立 `weapon`、`armor` 两个位置。装备不占四个被动槽，不授予职业核心、主动技能、通用被动或进化。

| 职业 | 两种武器外形 | 两种防具外形 |
|---|---|---|
| 战士 | 守卫铁剑 `warrior_weapon_iron`；赤刃重剑 `warrior_weapon_cleaver` | 银钢板甲 `warrior_armor_plate`；赤铜战甲 `warrior_armor_raider` |
| 法师 | 霜晶法杖 `mage_weapon_crystal`；余烬法杖 `mage_weapon_ember` | 黑星法袍 `mage_armor_star`；翠叶法袍 `mage_armor_leaf` |
| 弓手 | 林卫长弓 `archer_weapon_longbow`；猎鹰短弩 `archer_weapon_crossbow` | 狼首猎装 `archer_armor_scout`；鸮羽猎装 `archer_armor_ranger` |

`visualKey` 与 `appearance` 使用表内同一键。外形独立随机，不能用同一轮廓的品质变色代替两种外形。装备稀有度为 1～4；品质颜色只负责品质识别。

## 随机属性

每件装备随机一个适合本职业、本位置的主属性。武器从普攻、技能、攻速、暴击、冷却中按职业取池；防具从生命、减伤、移速、拾取范围取池。原始区间见 `equipment-data.js`，不将固定装备名绑定成唯一数值答案。

- 主属性强度：随机区间值 × `1 + 0.23 × (rarity - 1)` × `1 + 0.014 × min(room - 1, 59)`。
- 随机战斗词条数量：普通 0、精良 1、稀有 2、传奇 3，同一件内不重复，只从适合位置的 3 条中抽取。
- 词条强度：`[0.9, 1.1) × (1 + 0.18 × (rarity - 2)) × (1 + 0.008 × min(room - 1, 59))`。
- 关卡提高高稀有度权重，也提高已抽属性与词条强度。无尽阶段强度在第 60 关封顶，避免最终减伤、冷却等数值无限增长。
- 所有随机都使用调用方传入的 RNG，UID 由 World 提供；模块不调用 `Math.random()`。

## 六个战斗词条

| 词条 | 位置 | 实际玩法 | 限制 |
|---|---|---|---|
| 闪步装填 `dodgeLoad` | 武器 | 闪避给下一次普攻装入两颗扇形副弹，单弹基础伤害 `5 × strength` | 3 秒内消费；触发间隔 3 秒；实际弹道，撞墙终止 |
| 脉冲电容 `capacitor` | 武器 | 6 次普攻有效命中蓄一格，下次技能释放半径 140 的推退脉冲 | 同一普攻多目标只计一次；只存一格；派生弹和 DOT 不充能；Boss 不被推退 |
| 纵贯锋芒 `piercingEdge` | 武器 | 每 4 次实际普攻追加一发面向方向的贯穿针 | 最多穿 3 个目标；每目标一次；不能穿墙；不是增加锁敌范围 |
| 咏唱护壁 `spellWard` | 防具 | 施法提供 `8 × strength × shieldPower` 的 3 秒薄盾 | 间隔 4 秒；单次不超过最大生命 12%；沿用全局护盾上限及 FIFO 吸收账本 |
| 缓行足迹 `trailSnare` | 防具 | 闪避起点留 2.5 秒迟滞圈，改变追兵走位 | 间隔 5 秒；每人最多一个；无免费伤害、无永久异常堆叠 |
| 应急牵引 `panicMagnet` | 防具 | 真实失血时把近处经验与金币向自己拉近最多 90 距离 | 间隔 8 秒；不拉血瓶或他人碎片，不穿墙、不自动入账 |

副弹及脉冲统一使用 `source='proc'`、`depth=1`，不能再装填、蓄电或触发直接命中链。单人装备临时物体最多 12 个。失去来源装备、倒地、换人或清场后清除归属物体，不支付退场收益。

## 属性结算与换装

`h.equipment={weapon:item|null,armor:item|null}` 保存完整物品；`h.equipmentApplied` 保存已经计入角色的装备加值。换装一次性计算“当前值 - 旧装备加值 + 新装备加值”，不会反复累计。

增加生命上限不增加当前生命；卸下高生命装备只截断超过新上限的部分，不按比例回血。换装失败保持角色原状，装配保存物品副本，外部编辑库存对象不能改变已穿戴数据。

属性升级应通过 `withEquipmentBase(h, () => applyReward(...))`：临时剥离有训练上限的装备加值，再执行永久成长，最后恢复。生命上限不临时降低，因为生命与回血奖励必须看到真实穿戴上限。这样“65% 训练暴击上限 + 装备暴击”不会导致脱装时扣掉训练所得。

临时装备护盾进入现有 `h.universal.shields` FIFO，记录 `equipment:true`。换装、清理仅撤销装备盾尚未吸收的余量，不扣后来获得的其他盾。穿戴咏唱护壁且已有主动技能时，它计为碎盾荆种的真实护盾来源；换下该装备即撤销来源，未学主动时不会提前解锁来源依赖。

## 接入契约

数据与结算接口：

```js
rollEquipment(role, slot, room, rng, uid)
equipmentMods(item)
equipmentAffixes(hero)
applyEquipment(hero, item)
unequipEquipment(hero, slot)
withEquipmentBase(hero, callback)
```

物品格式：

```js
{ uid, role, slot, appearance, visualKey, rarity, level, name,
  main: { stat, value }, affixes: [{ key, strength }], price, sellPrice }
```

战斗接口：

```js
onEquipmentAttack(world, hero, action) // 普攻实际发出帧
onEquipmentSkill(world, hero, action)  // 成功施法
onEquipmentDodge(world, hero, direction) // 成功闪避
onEquipmentHit(world, enemy, hero, source, context, actualDamage)
onEquipmentHurt(world, hero, actualLostHp)
tickEquipment(world, dt)
resetEquipment(world, ownerId = null)
```

`world.equipmentObjects` 包含 `reloadBolt`、`piercingNeedle`、`snare`；每个物体有 `owner`、`sourceUid`、位置、寿命，弹体另有方向、速度与命中集合。模块负责扫掠判定，渲染层只负责根据这些状态画出弹与圈。短效提示采用 `type:'equipment'`、`variant:词条key`，同样携带 owner。

## 验证边界

已通过 25 项组件测试，覆盖可重放随机、所有稀有度和 12 个外形键、原子换装与属性撤销、封顶训练、生命安全、6 个词条的真实状态变化、扫描弹道、多人归属、冷却、寿命及循环限制。装备盾与通用被动的实际来源联动、换下失效均有回归。

六个词条已用实际生产绘制函数和现有 PNG 生成静态效果表，逐张检查了地面层、弹头与方向、不同效果的辨识；牵引效果使用实际经验与金币图形，不用回血十字误导。证据见 `output/v07/equipment-effects/six-affixes.png`。第一家店之前的正常机器人输入、真实金币积累结果见上方平衡文档。

待统一流程验证：实际商店库存与扣款、招募换人、真人两人同屏购买、消费后长期平衡。未将组件或静态图形 fixture 视为完整浏览器验收。
