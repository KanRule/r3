import {
	getColumnBatches
} from './shared/column.js';
import {getCaption} from './shared/language.js';
export {MyListOptions as default};

let MyListOptions = {
	name:'my-list-options',
	template:`<table class="generic-table generic-table-vertical fullWidth">
		<!-- general -->
		<tr>
			<td>{{ capApp.displayMode }}</td>
			<td>
				<div class="row nowrap gap">
					<select v-model="layoutInput">
						<option value="table">{{ capApp.option.layoutTable }}</option>
						<option value="cards">{{ capApp.option.layoutCards }}</option>
					</select>
					<my-button
						@trigger="layout === 'table' ? layoutInput = 'cards' : layoutInput = 'table'"
						:image="layoutInput === 'table' ? 'files_list1.png' : 'files_list3.png'"
						:naked="true"
					/>
				</div>
			</td>
		</tr>
		<tr v-if="layoutInput === 'cards'">
			<td>{{ capApp.cardsCaptions }}</td>
			<td><my-bool v-model="cardsCaptionsInput" /></td>
		</tr>

		<!-- column options -->
		<tr v-if="columnsAll.length > 1">
			<td>
				<div class="column gap">
					<span>{{ capGen.columns }}</span>
					<my-button image="refresh.png"
						@trigger="columnsReset"
						:caption="capGen.button.reset"
					/>
				</div>
			</td>
			<td>
				<div class="list-options-column-config">
					<template v-for="(b,bi) in columnBatchesAll">
						<div class="list-options-batch input-custom dynamic" v-if="getBatchIsVisible(b,columnIdsShown)">
							<div class="row nowrap">
								<my-button image="arrowUp.png"
									@trigger="clickBatchSort(b,true)"
									:active="columnBatchSortAll.indexOf(b.batchOrderIndex) !== 0"
									:naked="true"
								/>
								<my-button image="arrowDown.png"
									@trigger="clickBatchSort(b,false)"
									:active="columnBatchSortAll.indexOf(b.batchOrderIndex) !== columnBatches.length - 1"
									:naked="true"
								/>
							</div>
							<span v-if="b.columnIndexes.length > 1">{{ b.caption }}</span>

							<div class="list-options-batch-columns">
								<div class="list-options-batch-column clickable"
									v-for="ci in b.columnIndexes"
									@click="clickColumnInBatch(columnsAll[ci].id,b)"
									:class="{ notShown:!columnIdsShown.includes(columnsAll[ci].id) }"
								>
									{{ b.columnIndexes.length > 1 ? getTitle(columnsAll[ci]) : b.caption }}
								</div>
							</div>
						</div>
					</template>

					<br />
					<span v-if="columnBatchesAll.filter(v => !getBatchIsVisible(v,columnIdsShown)).length !== 0">{{ capGen.notShown }}</span>
					<template v-for="(b,bi) in columnBatchesAll">
						<div class="list-options-batch input-custom dynamic" v-if="!getBatchIsVisible(b,columnIdsShown)">
							<span v-if="b.columnIndexes.length > 1">{{ b.caption }}</span>

							<div class="list-options-batch-columns">
								<div class="list-options-batch-column clickable"
									v-for="ci in b.columnIndexes"
									@click="clickColumnInBatch(columnsAll[ci].id,b)"
									:class="{ notShown:!columnIdsShown.includes(columnsAll[ci].id) }"
								>
									{{ b.columnIndexes.length > 1 ? getTitle(columnsAll[ci]) : b.caption }}
								</div>
							</div>
						</div>
					</template>
				</div>
			</td>
		</tr>
	</table>`,
	props:{
        cardsCaptions:  { type:Boolean, required:true },
		columns:        { type:Array,   required:true }, // columns as they are visible to the field
		columnsAll:     { type:Array,   required:true }, // all columns, regardless of visibility
		columnBatches:  { type:Array,   required:true }, // column batches as they are visible to the field
		columnBatchSort:{ type:Array,   required:true }, // array of 2 arrays, [ batchSortShown, batchSortAll ]
        layout:         { type:String,  required:true },
        moduleId:       { type:String,  required:true }
	},
	emits:['reset', 'set-cards-captions', 'set-column-batch-sort', 'set-column-ids-by-user', 'set-layout'],
	computed:{
		columnBatchSortAll:(s) => {
			if(s.columnBatchSort[1].length === s.columnBatchesAll.length)
				return s.columnBatchSort[1];

			let out = [];
			for(let i = 0, j = s.columnBatchesAll.length; i < j; i++) {
				out.push(i);
			}
			return out;
		},
		columnIdsShown:(s) => {
			let out = [];
			for(const c of s.columns) {
				out.push(c.id);
			}
			return out;
		},

		// inputs
		cardsCaptionsInput:{
			get()  { return this.cardsCaptions; },
			set(v) { this.$emit('set-cards-captions',v); }
		},
		layoutInput:{
			get()  { return this.layout; },
			set(v) { this.$emit('set-layout',v); }
		},

		// simple
		columnBatchesAll:        (s) => s.getColumnBatches(s.moduleId,s.columnsAll,[],[],s.columnBatchSort[1],true),
		columnBatchesAllUnsorted:(s) => s.getColumnBatches(s.moduleId,s.columnsAll,[],[],[],true),

		// stores
		attributeIdMap:(s) => s.$store.getters['schema/attributeIdMap'],
		capApp:        (s) => s.$store.getters.captions.list,
		capGen:        (s) => s.$store.getters.captions.generic
	},
	methods:{
		// external
		getColumnBatches,
		getCaption,

		// presentation
		getBatchColumnCountVisible(columnBatch) {
			return columnBatch.columnIndexes.filter(v => this.columnIdsShown.includes(this.columnsAll[v].id)).length;
		},
		getBatchIsVisible(columnBatch,columnIdsShown) {
			for(const columnIndex of columnBatch.columnIndexes) {
				if(columnIdsShown.includes(this.columnsAll[columnIndex].id))
					return true;
			}
			return false;
		},
		getTitle(column) {
			const atr = this.attributeIdMap[column.attributeId];
			return this.getCaption('attributeTitle',this.moduleId,atr.id,atr.captions,atr.name);
		},

		// actions
		clickBatchSort(batch,up) {
			let out = JSON.parse(JSON.stringify(this.columnBatchSortAll));
			const pos    = out.indexOf(batch.batchOrderIndex);
			const posNew = up ? pos - 1 : pos + 1;
			out.splice(pos, 1);
			out.splice(posNew, 0, batch.batchOrderIndex);

			this.setBatchOrder(out,this.columnIdsShown);
		},
		clickColumnInBatch(columnId,columnBatch) {
			let outCols = JSON.parse(JSON.stringify(this.columnIdsShown));
			let outSort = JSON.parse(JSON.stringify(this.columnBatchSortAll));

			const columnsInBatchCount = this.getBatchColumnCountVisible(columnBatch);

			const pos = outCols.indexOf(columnId);
			if(pos !== -1) {
				outCols.splice(pos,1);

				// column to be removed is last one in batch, move to end of batch all order
				if(columnsInBatchCount === 1) {
					const posBatch = outSort.indexOf(columnBatch.batchOrderIndex);
					outSort.splice(posBatch,1);
					outSort.push(columnBatch.batchOrderIndex);
				}
			}
			else {
				outCols.push(columnId);

				// column to be added is first one in batch, move batch to end of shown batch order
				if(columnsInBatchCount === 0) {
					const posBatch = outSort.indexOf(columnBatch.batchOrderIndex);
					outSort.splice(posBatch,1);
					outSort.splice(this.columnBatches.length,0,columnBatch.batchOrderIndex);
				}
			};
			
			this.$emit('set-column-ids-by-user',outCols);
			this.setBatchOrder(outSort,outCols);
		},
		columnsReset() {
			this.$emit('set-column-ids-by-user',[]);
			this.$emit('set-column-batch-sort',[[],[]]);

			setTimeout(() => this.$emit('reset'),1000);
		},
		setBatchOrder(batchSortAll,columnIdsShown) {
			let batchSortShown = [];
			let indexesMissing = [];

			for(const batchIndex of batchSortAll) {
				const batch = this.columnBatchesAllUnsorted[batchIndex];
				if(this.getBatchIsVisible(batch,columnIdsShown))
				batchSortShown.push(batchIndex);
				else
					indexesMissing.push(batchIndex);
			}

			indexesMissing.sort((a,b) => b - a);
			for(const indexMissing of indexesMissing) {
				for(let i = 0, j = batchSortShown.length; i < j; i++) {
					if(batchSortShown[i] > indexMissing)
						batchSortShown[i]--;
				}
			}

			this.$emit('set-column-batch-sort',[batchSortShown,batchSortAll]);
		}
	}
};