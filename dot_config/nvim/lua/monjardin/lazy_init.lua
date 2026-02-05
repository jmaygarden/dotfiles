-- ~/.config/nvim/lua/nconf/lazy_init.lua

local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
	vim.fn.system({
		"git",
		"clone",
		"--filter=blob:none",
		"https://github.com/folke/lazy.nvim.git",
		"--branch=stable", -- latest stable release
		lazypath,
	})
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
	spec = {
		{ "folke/trouble.nvim" },
		{ "famiu/bufdelete.nvim" },
		{ "ellisonleao/gruvbox.nvim" },
		{
			"LazyVim/LazyVim",
			import = "lazyvim.plugins",
			opts = {
				colorscheme = "gruvbox",
			},
		},
		{ "hashivim/vim-terraform" },
		{ "github/copilot.vim" },
		{ import = "monjardin.lazy" },
	},
	change_detection = { notify = false },
})
