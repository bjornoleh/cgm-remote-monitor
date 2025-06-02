export interface FoodRecord {
	_id?: string;
	type: 'food';
	category: string;
	subcategory: string;
	name: string;
	portion: number;
	carbs: number;
	fat: number;
	protein: number;
	energy: number;
	gi: number;
	unit: string;
}

export interface QuickPickFood extends FoodRecord {
	portions: number;
}

export interface QuickPickRecord {
	_id?: string;
	type: 'quickpick';
	name: string;
	foods: QuickPickFood[];
	carbs: number;
	hideafteruse: boolean;
	hidden: boolean;
	position: number;
}

export interface FoodFilter {
	categories?: string[];
	subcategories?: string[];
	name?: string;
}

export interface Categories {
	[category: string]: {
		[subcategory: string]: boolean;
	};
}
