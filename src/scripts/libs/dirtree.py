import copy
import os
import re
import pickle
from collections.abc import Callable
from fnmatch import fnmatch
from pathlib import Path
from types import GenericAlias
from typing import Dict, List

from anytree import ChildResolverError, NodeMixin, PostOrderIter, PreOrderIter, Resolver
from anytree.exporter import JsonExporter
from anytree.importer import JsonImporter


def _repr(node, args=None, nameblacklist=None):
    classname = node.__class__.__name__
    args = args or []
    nameblacklist = nameblacklist or []
    for key, value in filter(
        lambda item: not item[0].startswith("_") and item[0] not in nameblacklist,
        sorted(node.__dict__.items(), key=lambda item: item[0]),
    ):
        args.append(f"{key}={value}")
    return f'{classname}({", ".join(args)})'


class RootNode(NodeMixin):
    def __init__(self, name, rootpath=None, parent=None, children=None, **kwargs):
        self.__dict__.update(kwargs)
        self.name = name
        self.rootpath = rootpath
        self.parent = parent
        self.type = "root"
        if children:
            self.children = children

    def __repr__(self):
        args = [str(self.separator.join([""] + [str(node.name) for node in self.path]))]
        return _repr(self, args=args, nameblacklist=["name"])

    def get_path(self):
        return Path(
            "/".join(
                [f"{node.rootpath}/{node.name}" if type(node) == RootNode else str(node.name) for node in self.path]
            )
        )

    def get_relpath(self):
        return Path("/".join([f"{node.name}" if type(node) == RootNode else str(node.name) for node in self.path]))


class FileNode(NodeMixin):
    def __init__(self, name, parent=None, children=None, **kwargs):
        self.__dict__.update(kwargs)
        self.name = name
        self.parent = parent
        self.type = "file"
        if children:
            self.children = children

    def __repr__(self):
        args = [str(self.separator.join([""] + [str(node.name) for node in self.path]))]
        return _repr(self, args=args, nameblacklist=["name"])

    def get_path(self):
        return Path(
            "/".join(
                [f"{node.rootpath}/{node.name}" if type(node) == RootNode else str(node.name) for node in self.path]
            )
        )

    def get_relpath(self):
        return Path("/".join([f"{node.name}" if type(node) == RootNode else str(node.name) for node in self.path]))


class DirNode(FileNode):
    def __init__(self, name, parent=None, children=None, **kwargs):
        super().__init__(name, parent, children, **kwargs)
        self.type = "dir"

    def __repr__(self):
        args = [str(self.separator.join([""] + [str(node.name) for node in self.path]))]
        return _repr(self, args=args, nameblacklist=["name"])


def load_dirtree(path):
    with open(path, "rb") as f:
        dirtree = pickle.load(f)
        dirtree.rootpath = Path(dirtree.rootpath)
    return dirtree


def load_json_dirtree(path):
    importer = JsonImporter()
    with open(path, encoding="utf-8") as f:
        treenode = importer.read(f)

    def _make_kwargs(node):
        kwargs = copy.deepcopy(node.__dict__)
        kwargs.pop("_NodeMixin__parent", None)
        kwargs.pop("_NodeMixin__children", None)
        kwargs.pop("name", None)
        kwargs.pop("type", None)
        return kwargs

    def _top_down_walk(node, parent):
        if node.type == "file":
            kwargs = _make_kwargs(node)
            FileNode(name=node.name, parent=parent, type=node.type, **kwargs)

        if node.type == "root":
            next_parent = parent

        if node.type == "dir":
            kwargs = _make_kwargs(node)
            next_parent = DirNode(name=node.name, parent=parent, type=node.type, **kwargs)

        if node.type == "root" or node.type == "dir":
            for child in node.children:
                _top_down_walk(child, next_parent)

    kwargs = _make_kwargs(treenode)
    kwargs.pop("rootpath", None)
    root = RootNode(name=treenode.name, rootpath=Path(treenode.rootpath), type=treenode.type, **kwargs)

    _top_down_walk(treenode, root)

    return root


def save_dirtree(dirtree, path):
    t = copy_dirtree(dirtree)
    t.rootpath = str(t.rootpath)
    with open(path, "wb") as f:
        pickle.dump(t, f)


def save_json_dirtree(dirtree, path):
    exporter = JsonExporter(indent=2, sort_keys=False)
    t = copy_dirtree(dirtree)
    t.rootpath = str(t.rootpath)
    with open(path, "w", encoding="utf-8") as f:
        exporter.write(t, f)


def get_dirtree(path):
    DIR = Path(path).resolve()
    PARENT = DIR.parent

    root = RootNode(name=DIR.name, rootpath=PARENT)
    resolver = Resolver("name")

    for dirpath, dirnames, filenames in os.walk(top=DIR, topdown=True, onerror=None, followlinks=False):
        node = resolver.get(root, f"/{Path(dirpath).relative_to(PARENT)}")

        for dirname in dirnames:
            DirNode(dirname, parent=node)

        for filename in filenames:
            FileNode(filename, parent=node)

    return root


# pylint: disable-next=unused-argument
def bottom_up_rootfunc(node, children, options):
    return RootNode(name=node.name, rootpath=node.rootpath, children=children)


# pylint: disable-next=unused-argument
def bottom_up_filefunc(node, options):
    return FileNode(name=node.name)


# pylint: disable-next=unused-argument
def bottom_up_dirfunc(node, children, options):
    return DirNode(name=node.name, children=children)


def bottom_up_walk(
    node,
    options,
    rootfunc: Callable[[RootNode, List[FileNode], Dict], RootNode] = bottom_up_rootfunc,
    filefunc: Callable[[FileNode, Dict], FileNode] = bottom_up_filefunc,
    dirfunc: Callable[[DirNode, List[FileNode], Dict], DirNode] = bottom_up_dirfunc,
):
    if type(node) == FileNode:
        return filefunc(node, options)

    children = []
    if type(node) == RootNode or type(node) == DirNode:
        for child in node.children:
            n = bottom_up_walk(child, options, rootfunc, filefunc, dirfunc)
            if n:
                children.append(n)

    if type(node) == RootNode:
        return rootfunc(node, children, options)

    return dirfunc(node, children, options)


# pylint: disable-next=unused-argument
def top_down_rootfunc(node, options):
    return RootNode(name=node.name, rootpath=node.rootpath)


# pylint: disable-next=unused-argument
def top_down_filefunc(node, parent, options):
    return FileNode(name=node.name, parent=parent)


# pylint: disable-next=unused-argument
def top_down_dirfunc(node, parent, options):
    return DirNode(name=node.name, parent=parent)


def top_down_walk(
    node,
    parent,
    options,
    rootfunc: Callable[[RootNode, List[FileNode], Dict], RootNode] = top_down_rootfunc,
    filefunc: Callable[[FileNode, Dict], FileNode] = top_down_filefunc,
    dirfunc: Callable[[DirNode, List[FileNode], Dict], DirNode] = top_down_dirfunc,
):
    if type(node) == FileNode:
        return filefunc(node, parent, options)

    if type(node) == RootNode:
        next_parent = rootfunc(node, options)

    if type(node) == DirNode:
        next_parent = dirfunc(node, parent, options)

    if type(node) == RootNode or type(node) == DirNode:
        for child in node.children:
            top_down_walk(child, next_parent, options, rootfunc, filefunc, dirfunc)

    return next_parent


def duplicate_dirtree(rootnode):

    # pylint: disable-next=unused-argument
    def filefunc(node, options):
        return FileNode(name=node.name)

    # pylint: disable-next=unused-argument
    def dirfunc(node, children, options):
        return DirNode(name=node.name, children=children)

    return bottom_up_walk(rootnode, {}, filefunc, dirfunc)


def filter_dirtree(rootnode, includes: List[str], excludes: List[str]):
    def filefunc(node, options):
        if options["excludes"]:
            for pat in options["excludes"]:
                if fnmatch(node.name, pat):
                    return None
        if options["includes"]:
            for pat in options["includes"]:
                if fnmatch(node.name, pat):
                    return FileNode(name=node.name)
            return None
        else:
            return FileNode(name=node.name)

    # pylint: disable-next=unused-argument
    def dirfunc(node, children, options):
        if len(children) == 0:
            return None
        return DirNode(name=node.name, children=children)

    return bottom_up_walk(rootnode, {"includes": includes, "excludes": excludes}, filefunc=filefunc, dirfunc=dirfunc)


def copy_dirtree(rootnode):
    return copy.deepcopy(rootnode)


def stat_dirtree(rootnode):

    for node in PostOrderIter(rootnode):
        if type(node) == FileNode:
            st = node.get_path().stat()
            node.size = st.st_size
            node.mtime = st.st_mtime
            node.ctime = st.st_ctime

    for node in PostOrderIter(rootnode):
        if type(node) == DirNode:
            st = node.get_path().stat()
            size = 0
            for child in node.children:
                size += child.size
            node.size = size
            node.mtime = st.st_mtime
            node.ctime = st.st_ctime


def node_full_match(a, b):
    return (a.name == b.name) and (a.size == b.size) and (a.hash == b.hash)


def node_name_match(a, b):
    return a.name == b.name


def node_size_match(a, b):
    return a.size == b.size


def node_hash_match(a, b):
    return a.hash == b.hash


def node_partial_name_match(a, b):
    p = re.compile(r"^([^.-]*?)-?([^-]*?)-?([0-9]{8})-?([0-9]{6}).*\.avi$")

    ma = p.match(a.name)
    mb = p.match(b.name)

    if ma and mb:
        return ma.group(3) == mb.group(3) and ma.group(4) == mb.group(4)

    return a.name == b.name


def cmpfiles(a, b, common_names, cmpfunc=node_full_match):
    def _cmp(a, b, cmpfunc):
        try:
            return 0 if cmpfunc(a, b) else 1
        except:
            return 2

    resolver = Resolver("name")
    res = ([], [], [])
    for aa, bb in common_names:
        ax = resolver.get(a, aa)
        bx = resolver.get(b, bb)
        res[_cmp(ax, bx, cmpfunc)].append((aa, bb))
    return res


# pylint: disable-next=attribute-defined-outside-init
class treecmp:
    def __init__(self, a, b, cmp_func=node_full_match, excludes=None):
        self.cmp_func = cmp_func
        self.left = a
        self.right = b
        self.resolver = Resolver("name")
        self.excludes = excludes

    def phase0(self):  # Compare everything except common subdirectories
        def _filter_name(name, excludes):
            if excludes is None:
                return True

            for pat in excludes:
                if fnmatch(name, pat):
                    return False

            return True

        self.left_list = [c.name for c in self.left.children if _filter_name(c.name, self.excludes)]
        self.right_list = [c.name for c in self.right.children if _filter_name(c.name, self.excludes)]
        self.left_list.sort()
        self.right_list.sort()

    def phase1(self):  # Compute common names
        def _partial_name_match(a, b):
            p = re.compile(r"^([^.-]*?)-?([^-]*?)-?([0-9]{8})-?([0-9]{6}).*\.avi$")
            ma = p.match(a)
            mb = p.match(b)
            if ma and mb:
                return ma.group(3) == mb.group(3) and ma.group(4) == mb.group(4)
            return a == b

        self.common = []
        self.left_only = copy.deepcopy(self.left_list)
        self.right_only = copy.deepcopy(self.right_list)

        for bx in self.right_list:
            for ax in self.left_list:
                if _partial_name_match(ax, bx):
                    self.common.append((ax, bx))

        for ax, bx in self.common:
            if ax in self.left_only:
                self.left_only.remove(ax)
            if bx in self.right_only:
                self.right_only.remove(bx)

    def phase2(self):  # Distinguish files, directories, funnies
        self.common_dirs = []
        self.common_files = []
        self.common_funny = []

        for ax, bx in self.common:
            ok = 1
            try:
                a = self.resolver.get(self.left, ax)
            except ChildResolverError:
                ok = 0
            try:
                b = self.resolver.get(self.right, bx)
            except ChildResolverError:
                ok = 0

            if ok:
                if a.type != b.type:
                    self.common_funny.append(ax)
                elif a.type == "dir":
                    self.common_dirs.append(ax)
                elif a.type == "file":
                    self.common_files.append((ax, bx))
                else:
                    self.common_funny.append(ax)
            else:
                self.common_funny.append(ax)

    def phase3(self):  # Find out differences between common files
        xx = cmpfiles(self.left, self.right, self.common_files, self.cmp_func)
        self.same_files, self.diff_files, self.funny_files = xx

    def phase4(self):  # Find out differences between common subdirectories
        self.subdirs = {}
        for x in self.common_dirs:
            a_x = self.resolver.get(self.left, x)
            b_x = self.resolver.get(self.right, x)
            self.subdirs[x] = self.__class__(a_x, b_x, self.cmp_func, self.excludes)

    def phase4_closure(self):  # Recursively call phase4() on subdirectories
        self.phase4()
        for sd in self.subdirs.values():
            sd.phase4_closure()

    def report(self):  # Print a report on the differences between a and b
        # Output format is purposely lousy
        print("diff", self.left.get_relpath())
        if self.left_only:
            self.left_only.sort()
            print("Only in", "Left", ":", self.left_only)
        if self.right_only:
            self.right_only.sort()
            print("Only in", "Right", ":", self.right_only)
        if self.same_files:
            self.same_files.sort()
            print("Identical files :", [f"{f[0]}|{f[1]}" for f in self.same_files])
        if self.diff_files:
            self.diff_files.sort()
            print("Differing files :", [f"{f[0]}|{f[1]}" for f in self.diff_files])
        if self.funny_files:
            self.funny_files.sort()
            print("Trouble with common files :", [f"{f[0]}|{f[1]}" for f in self.funny_files])
        if self.common_dirs:
            self.common_dirs.sort()
            print("Common subdirectories :", self.common_dirs)
        if self.common_funny:
            self.common_funny.sort()
            print("Common funny cases :", self.common_funny)

    def report_partial_closure(self):  # Print reports on self and on subdirs
        self.report()
        for sd in self.subdirs.values():
            print()
            sd.report()

    def report_full_closure(self):  # Report on self and subdirs recursively
        self.report()
        for sd in self.subdirs.values():
            print()
            sd.report_full_closure()

    def print_diff_files(self):
        for name in self.diff_files:
            resolver = Resolver("name")
            a = resolver.get(self.left, name[0])
            b = resolver.get(self.right, name[1])
            print(
                f'diff in [{self.left.get_relpath()}] left: "name={a.name},size={a.size},hash={a.hash[:16]}…", right: "name={b.name},size={b.size},hash={b.hash[:16]}…"'
            )

        for sub_dcmp in self.subdirs.values():
            sub_dcmp.print_diff_files()

    methodmap = dict(
        subdirs=phase4,
        same_files=phase3,
        diff_files=phase3,
        funny_files=phase3,
        common_dirs=phase2,
        common_files=phase2,
        common_funny=phase2,
        common=phase1,
        left_only=phase1,
        right_only=phase1,
        left_list=phase0,
        right_list=phase0,
    )

    def __getattr__(self, attr):
        if attr not in self.methodmap:
            raise AttributeError(attr)
        self.methodmap[attr](self)
        return getattr(self, attr)

    __class_getitem__ = classmethod(GenericAlias)
