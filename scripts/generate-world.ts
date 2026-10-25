/* eslint-disable no-console */
/**
 * Generates the world map and stores it in public/world/world.json (the browser
 * loads it from there). The same seed always gives the same world.
 *
 * Usage: yarn world:generate [seed]
 */
import { writeFileSync } from 'fs'
import { join } from 'path'
import { WORLD_SEED } from '@/app/(protected)/(engine)/data/world'
import { NodeType } from '@/app/(protected)/(engine)/models/NodeType'
import { generateWorld } from '@/app/(protected)/(engine)/utils/worldGenerator'

const seed = process.argv[2] ? Number(process.argv[2]) : WORLD_SEED
const started = Date.now()
const world = generateWorld(seed)
const output = join(__dirname, '..', 'public', 'world', 'world.json')

writeFileSync(output, JSON.stringify(world))

const count = (type: NodeType) => world.nodes.filter((node) => node.type === type).length

console.log(`World generated in ${Date.now() - started} ms (seed ${seed} → ${world.seed}): ${output}`)
console.log(`  ${world.nodes.length} points, ${world.edges.length} trails`)
console.log(`  ${count(NodeType.CAMP_BOSS) + count(NodeType.START)} camps, ${count(NodeType.SANCTUARY)} sanctuaries`)
console.log(`  ${count(NodeType.MERCHANT)} merchants, ${count(NodeType.TEAR)} Tears, ${count(NodeType.CHEST)} chests`)
console.log(`  ${count(NodeType.COMBAT)} fights`)
