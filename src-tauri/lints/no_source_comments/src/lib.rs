#![feature(rustc_private)]
#![warn(unused_extern_crates)]

extern crate rustc_ast;
extern crate rustc_lexer;
extern crate rustc_span;

use clippy_utils::diagnostics::span_lint;
use rustc_ast::ast;
use rustc_lexer::{tokenize, FrontmatterAllowed, TokenKind};
use rustc_lint::{EarlyContext, EarlyLintPass, LintContext};
use rustc_span::def_id::LOCAL_CRATE;
use rustc_span::{BytePos, Span};

dylint_linting::declare_early_lint! {
    /// ### What it does
    ///
    /// Denies `//`, `///`, `/*!`, and `/*` comments in Rust sources.
    ///
    /// ### Why is this bad?
    ///
    /// Intent should be expressed in code. Clippy has no lint that forbids
    /// source comments.
    ///
    /// ### Example
    ///
    /// ```rust
    /// // bad: explains intent in a comment
    /// fn greet() {}
    /// ```
    ///
    /// Use instead:
    ///
    /// ```rust
    /// fn greet() {}
    /// ```
    pub NO_SOURCE_COMMENTS,
    Deny,
    "source comments are banned; express intent in code"
}

impl EarlyLintPass for NoSourceComments {
    fn check_crate(&mut self, cx: &EarlyContext<'_>, _: &ast::Crate) {
        let source_map = cx.sess().source_map();
        for source_file in source_map.files().iter() {
            if source_file.cnum != LOCAL_CRATE {
                continue;
            }
            let Some(src) = source_file.src.as_deref() else {
                continue;
            };
            lint_comments_in_source(cx, source_file.start_pos, src);
        }
    }
}

fn lint_comments_in_source(cx: &EarlyContext<'_>, start_pos: BytePos, src: &str) {
    let mut offset = rustc_lexer::strip_shebang(src).unwrap_or(0);
    for token in tokenize(&src[offset..], FrontmatterAllowed::Yes) {
        let token_start = offset;
        offset += token.len as usize;
        match token.kind {
            TokenKind::LineComment { .. } | TokenKind::BlockComment { .. } => {
                let lo = start_pos + BytePos(token_start as u32);
                let hi = start_pos + BytePos(offset as u32);
                let span = Span::with_root_ctxt(lo, hi);
                span_lint(
                    cx,
                    NO_SOURCE_COMMENTS,
                    span,
                    "source comments are banned; express intent in code",
                );
            }
            _ => {}
        }
    }
}

#[test]
fn ui() {
    dylint_testing::ui_test(env!("CARGO_PKG_NAME"), "ui");
}
