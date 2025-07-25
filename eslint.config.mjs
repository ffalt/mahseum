import eslint from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";
import reactRefresh from "eslint-plugin-react-refresh";

export default ts.config(
	{
		ignores: [
			"src/app/data.ts",
			"**/dist/**/*",
			"**/build/**/*",
			"**/local/**/*"
		]
	},
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: "script",
			globals: globals.browser,
			parserOptions: {
				project: ["tsconfig.json"],
				createDefaultProgram: true
			}
		},
		extends: [
			eslint.configs.recommended,
			...ts.configs.recommended,
			...ts.configs.stylistic,
			reactRefresh.configs.recommended
		],
		rules: {
			"arrow-body-style": ["error", "as-needed"],
			"arrow-parens": ["error", "as-needed"],
			"brace-style": ["error", "1tbs"],
			"class-methods-use-this": "off",
			"comma-dangle": "error",
			"complexity": ["error", { max: 20 }],
			"default-case": "error",
			"max-classes-per-file": ["error", 2],
			"max-len": ["error", { code: 240 }],
			"max-lines": ["error", 1000],
			"no-duplicate-case": "error",
			"no-duplicate-imports": "error",
			"no-empty": "error",
			"no-extra-bind": "error",
			"no-invalid-this": "error",
			"no-multiple-empty-lines": ["error", { max: 1 }],
			"no-new-func": "error",
			"no-param-reassign": "error",
			"no-return-await": "error",
			"no-sequences": "error",
			"no-sparse-arrays": "error",
			"no-template-curly-in-string": "error",
			"no-void": "error",
			"prefer-const": "error",
			"prefer-object-spread": "error",
			"prefer-template": "error",
			"space-in-parens": ["error", "never"],
			"yoda": "error",

			"react-refresh/only-export-components": ["error", { "allowConstantExport": true }],

			"@typescript-eslint/array-type": ["error", { "default": "generic" }],
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/ban-ts-comment": "error",
			"@typescript-eslint/consistent-indexed-object-style": "off",
			"@typescript-eslint/consistent-type-definitions": "error",
			"@typescript-eslint/explicit-member-accessibility": ["error", { "accessibility": "no-public" }],
			"@typescript-eslint/naming-convention": "off",
			"@typescript-eslint/no-empty-function": "error",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-for-in-array": "error",
			"@typescript-eslint/no-inferrable-types": "off",
			"@typescript-eslint/no-namespace": "error",
			"@typescript-eslint/no-require-imports": "error",
			"@typescript-eslint/no-this-alias": "error",
			"@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
			"@typescript-eslint/no-unnecessary-type-arguments": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/no-unused-expressions": ["error", { "allowShortCircuit": true }],
			"@typescript-eslint/no-var-requires": "error",
			"@typescript-eslint/prefer-readonly": "error",
			"@typescript-eslint/promise-function-async": "error",
			"@typescript-eslint/restrict-plus-operands": "error",
			"@typescript-eslint/unbound-method": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					"args": "all",
					"argsIgnorePattern": "^_",
					"caughtErrors": "all",
					"caughtErrorsIgnorePattern": "^_",
					"destructuredArrayIgnorePattern": "^_",
					"varsIgnorePattern": "^_",
					"ignoreRestSiblings": true
				}
			]
		}
	},
	{
		files: ["vite.config.ts"],
		languageOptions: {
			parserOptions: {
				project: ["tsconfig.node.json"]
			}
		},
		extends: [
			eslint.configs.recommended,
			...ts.configs.recommended,
			...ts.configs.stylistic
		],
		rules: {
			"arrow-body-style": ["error", "as-needed"],
			"arrow-parens": ["error", "as-needed"],
			"brace-style": ["error", "1tbs"],
			"class-methods-use-this": "off",
			"comma-dangle": "error",
			"complexity": ["error", { max: 20 }],
			"default-case": "error",
			"max-classes-per-file": ["error", 2],
			"max-len": ["error", { code: 240 }],
			"max-lines": ["error", 1000],
			"no-duplicate-case": "error",
			"no-duplicate-imports": "error",
			"no-empty": "error",
			"no-extra-bind": "error",
			"no-invalid-this": "error",
			"no-multiple-empty-lines": ["error", { max: 1 }],
			"no-new-func": "error",
			"no-param-reassign": "error",
			"no-return-await": "error",
			"no-sequences": "error",
			"no-sparse-arrays": "error",
			"no-template-curly-in-string": "error",
			"no-void": "error",
			"prefer-const": "error",
			"prefer-object-spread": "error",
			"prefer-template": "error",
			"space-in-parens": ["error", "never"],
			"yoda": "error",

			"@typescript-eslint/array-type": ["error", { default: "generic" }],
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/ban-ts-comment": "error",
			"@typescript-eslint/consistent-indexed-object-style": "off",
			"@typescript-eslint/consistent-type-definitions": "error",
			"@typescript-eslint/explicit-member-accessibility": ["error", { accessibility: "no-public" }],
			"@typescript-eslint/naming-convention": "off",
			"@typescript-eslint/no-empty-function": "error",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-for-in-array": "error",
			"@typescript-eslint/no-inferrable-types": "off",
			"@typescript-eslint/no-namespace": "error",
			"@typescript-eslint/no-require-imports": "error",
			"@typescript-eslint/no-this-alias": "error",
			"@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
			"@typescript-eslint/no-unnecessary-type-arguments": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true }],
			"@typescript-eslint/no-var-requires": "error",
			"@typescript-eslint/prefer-readonly": "error",
			"@typescript-eslint/promise-function-async": "error",
			"@typescript-eslint/restrict-plus-operands": "error",
			"@typescript-eslint/unbound-method": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					"args": "all",
					"argsIgnorePattern": "^_",
					"caughtErrors": "all",
					"caughtErrorsIgnorePattern": "^_",
					"destructuredArrayIgnorePattern": "^_",
					"varsIgnorePattern": "^_",
					"ignoreRestSiblings": true
				}
			]
		}
	},
	{
		files: ["**/*.{js,mjs,cjs}"],
		extends: [
			eslint.configs.recommended
		],
		rules: {
			"arrow-body-style": ["error", "as-needed"],
			"arrow-parens": ["error", "as-needed"],
			"brace-style": ["error", "1tbs"],
			"comma-dangle": "error",
			"complexity": ["error", { "max": 20 }],
			"default-case": "error",
			"max-classes-per-file": ["error", 2],
			"max-len": ["error", { "code": 240 }],
			"max-lines": ["error", 1000],
			"newline-per-chained-call": "off",
			"no-duplicate-case": "error",
			"no-duplicate-imports": "error",
			"no-empty": "error",
			"no-extra-bind": "error",
			"no-invalid-this": "error",
			"no-multiple-empty-lines": ["error", { "max": 1 }],
			"no-new-func": "error",
			"no-param-reassign": "error",
			"no-redeclare": "error",
			"no-return-await": "error",
			"no-sequences": "error",
			"no-sparse-arrays": "error",
			"no-template-curly-in-string": "error",
			"no-void": "error",
			"prefer-const": "error",
			"prefer-object-spread": "error",
			"prefer-template": "error",
			"space-in-parens": ["error", "never"],
			"yoda": "error"
		}
	}
);
