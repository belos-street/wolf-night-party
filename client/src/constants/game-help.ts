export const GAME_RULE_SUMMARY = [
  '标准模式支持 6-12 人开局，角色预设由服务端自动套用。',
  '6-9 人屠城：狼人数量 >= 存活好人数量即可获胜。',
  '10-12 人屠边：屠神或屠民任一条件达成即可获胜。',
  '白天自由讨论无计时，平票仅重投 1 轮。'
]

export const ROLE_HELP_SUMMARY = [
  { role: '预言家', description: '每晚查验 1 名玩家身份。' },
  { role: '女巫', description: '拥有 1 瓶解药与 1 瓶毒药，同夜不可双用。' },
  { role: '猎人', description: '死于狼刀或放逐可开枪，死于毒杀不可开枪。' },
  { role: '守卫', description: '每晚守护 1 人，不能连续守同一目标。' },
  { role: '白痴', description: '被放逐翻牌后继续存活，但永久失去投票权。' }
]
