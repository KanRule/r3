import MyCaptionMap from '../captionMap.js';
export {MyBuilderCaptionMap as default};

let MyBuilderCaptionMap = {
	name:'my-builder-caption-map',
	components:{ MyCaptionMap },
	template:`<my-caption-map target="app"
		:moduleIdForce="id"
		:languageDefault="builderLanguage"
	/>`,
	props:{
		builderLanguage:{ type:String,  required:true },
		id:             { type:String,  required:true },
		readonly:       { type:Boolean, required:true }
	}
};