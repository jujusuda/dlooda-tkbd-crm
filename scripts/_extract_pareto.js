const fs = require('fs');
const path = require('path');

const c = fs.readFileSync(path.join(__dirname, '..', 'js', 'real-data.js'), 'utf-8');
const start = c.indexOf('JSON.parse("') + 'JSON.parse("'.length;
const end = c.lastIndexOf('")');
const raw = c.substring(start, end).replace(/\\"/g, '"');
const data = JSON.parse(raw);

console.log('creators:', data.creators.length);

let n = 0;
data.creators.forEach(cr => { if (Number(cr.orderCount) > 0) n++; });
console.log('with orders:', n);

// Show samples
let shown = 0;
for (const cr of data.creators) {
    if (Number(cr.orderCount) > 0) {
        console.log(cr.name, 'orders=' + cr.orderCount, 'skus=' + JSON.stringify(cr.skus));
        if (++shown >= 10) break;
    }
}

// === Pareto analysis ===
const targetSkus = ['2178', '2190', '2722', '2189', '28173', '2789', '2757'];
const skuMap = {};
targetSkus.forEach(s => skuMap[s] = []);

data.creators.forEach(cr => {
    const oc = Number(cr.orderCount);
    if (!oc || oc <= 0) return;
    const skus = cr.skus || [];
    if (!Array.isArray(skus)) return;
    skus.forEach(s => {
        if (skuMap[s]) skuMap[s].push({ name: cr.name, orders: oc });
    });
});

console.log('\n=== PARETO ANALYSIS ===');
const output = {};

targetSkus.forEach(sku => {
    const list = skuMap[sku].sort((a, b) => b.orders - a.orders);
    const total = list.reduce((s, o) => s + o.orders, 0);
    const cnt = list.length;

    if (cnt === 0) {
        output[sku] = { total_orders: 0, creator_count: 0, top_creators: [], pareto: { top20_pct: 0 } };
        return;
    }

    const t20 = Math.max(1, Math.round(cnt * 0.2));
    const t20sum = list.slice(0, t20).reduce((s, o) => s + o.orders, 0);
    const t20pct = total > 0 ? t20sum / total * 100 : 0;

    console.log(sku + ': ' + cnt + ' creators, total=' + total + ', top20%(' + t20 + ')=' + t20sum + '(' + t20pct.toFixed(1) + '%)');

    const topList = list.slice(0, 10).map((o, i) => ({
        label: String.fromCharCode(65 + i),
        name: o.name,
        orders: o.orders,
        pct: total > 0 ? Math.round(o.orders / total * 1000) / 10 : 0
    }));
    topList.slice(0, 5).forEach(o => console.log('  ' + o.label + '. ' + o.name + ': ' + o.orders + ' (' + o.pct + '%)'));

    output[sku] = {
        total_orders: total,
        creator_count: cnt,
        top_creators: topList,
        pareto: { top20_count: t20, top20_orders: t20sum, total: total, top20_pct: Math.round(t20pct * 10) / 10 }
    };
});

fs.writeFileSync(path.join(__dirname, '_pareto_data.json'), JSON.stringify(output, null, 2), 'utf-8');
console.log('\nSaved _pareto_data.json');
